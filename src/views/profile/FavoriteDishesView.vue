<script setup>
import { onMounted, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { fetchFavoriteDishes } from '@/api/dish.api.js';
import {
  addFavoriteGroupMember,
  createFavoriteGroup,
  deleteFavoriteGroup,
  fetchFavoriteGroupMemberships,
  fetchFavoriteGroups,
  removeFavoriteGroupMember,
  updateFavoriteGroup,
} from '@/api/favoriteGroups.api.js';
import { usePagedData } from '@/composables/usePagedData.js';
import { formatPrice } from '@/utils/mediaUrl.js';
import BackLink from '@/components/base/BackLink.vue';
import DishLink from '@/components/canteen/DishLink.vue';
import ErrorState from '@/components/base/ErrorState.vue';
import LoadingState from '@/components/base/LoadingState.vue';
import PaginationControls from '@/components/base/PaginationControls.vue';

const groups = ref([]);
const groupsError = ref('');
const selectedGroupId = ref(null);
const unfiled = ref(false);
const membershipDishId = ref(null);
const membershipGroupIds = ref([]);
const membershipLoading = ref(false);

const state = usePagedData((page, options) =>
  fetchFavoriteDishes(page, options, {
    groupId: selectedGroupId.value,
    unfiled: unfiled.value,
  }),
);

async function reloadGroups() {
  groupsError.value = '';
  try {
    groups.value = await fetchFavoriteGroups('dish');
  } catch (error) {
    groupsError.value = error.message || '无法读取分组';
  }
}

function selectGroup(groupId = null, onlyUnfiled = false) {
  selectedGroupId.value = groupId;
  unfiled.value = onlyUnfiled;
  membershipDishId.value = null;
  state.page.value = 1;
  state.load();
}

async function createGroup() {
  try {
    const { value } = await ElMessageBox.prompt(
      '分组名称 1–20 个字符，同类型不能重名。',
      '新建菜品分组',
      { inputPattern: /\S/, inputErrorMessage: '请输入分组名称' },
    );
    const group = await createFavoriteGroup('dish', value);
    await reloadGroups();
    selectGroup(group.id);
  } catch (error) {
    if (error !== 'cancel' && error !== 'close')
      ElMessage.error(error.message || '创建分组失败');
  }
}

async function renameGroup(group) {
  try {
    const { value } = await ElMessageBox.prompt('新的分组名称', '重命名分组', {
      inputValue: group.name,
      inputPattern: /\S/,
      inputErrorMessage: '请输入分组名称',
    });
    await updateFavoriteGroup(group.id, {
      name: value,
      expectedRevision: group.revision,
    });
    await reloadGroups();
  } catch (error) {
    if (error !== 'cancel' && error !== 'close')
      ElMessage.error(error.message || '重命名失败');
  }
}

async function removeGroup(group) {
  if (!window.confirm(`删除分组“${group.name}”？收藏本身会保留。`)) return;
  try {
    await deleteFavoriteGroup(group.id);
    if (selectedGroupId.value === group.id) selectGroup();
    await reloadGroups();
    state.load();
  } catch (error) {
    ElMessage.error(error.message || '删除分组失败');
  }
}

async function toggleMembershipPanel(dish) {
  if (membershipDishId.value === dish.id) {
    membershipDishId.value = null;
    return;
  }
  membershipDishId.value = dish.id;
  membershipLoading.value = true;
  try {
    const data = await fetchFavoriteGroupMemberships('dish', dish.id);
    membershipGroupIds.value = data.groupIds || [];
  } catch (error) {
    membershipGroupIds.value = [];
    ElMessage.error(error.message || '无法读取分组关系');
  } finally {
    membershipLoading.value = false;
  }
}

async function toggleMembership(group, dish) {
  const joined = membershipGroupIds.value.includes(group.id);
  try {
    if (joined) {
      await removeFavoriteGroupMember(group.id, dish.id);
      membershipGroupIds.value = membershipGroupIds.value.filter(
        (id) => id !== group.id,
      );
    } else {
      await addFavoriteGroupMember(group.id, dish.id);
      membershipGroupIds.value = [...membershipGroupIds.value, group.id];
    }
    await reloadGroups();
  } catch (error) {
    ElMessage.error(error.message || '更新分组失败');
  }
}

onMounted(reloadGroups);
</script>

<template>
  <main class="favorite-dishes">
    <BackLink />
    <h1 class="section-title">想吃清单</h1>

    <div class="favorite-dishes__groups" aria-label="菜品收藏分组">
      <button
        type="button"
        :class="{ 'is-active': !selectedGroupId && !unfiled }"
        @click="selectGroup()"
      >
        全部
      </button>
      <button
        type="button"
        :class="{ 'is-active': unfiled }"
        @click="selectGroup(null, true)"
      >
        未分组
      </button>
      <span
        v-for="group in groups"
        :key="group.id"
        class="favorite-dishes__group"
        :class="{ 'is-active': selectedGroupId === group.id }"
      >
        <button type="button" @click="selectGroup(group.id)">
          {{ group.name }} ({{ group.itemCount }})
        </button>
        <button
          type="button"
          class="favorite-dishes__group-action"
          aria-label="重命名分组"
          @click.stop="renameGroup(group)"
        >
          改名
        </button>
        <button
          type="button"
          class="favorite-dishes__group-action is-danger"
          aria-label="删除分组"
          @click.stop="removeGroup(group)"
        >
          删除
        </button>
      </span>
      <button
        type="button"
        class="favorite-dishes__create"
        @click="createGroup"
      >
        + 新建分组
      </button>
    </div>
    <p v-if="groupsError" role="alert">{{ groupsError }}</p>

    <LoadingState v-if="state.loading.value" />
    <ErrorState
      v-else-if="state.error.value"
      :description="state.error.value.message"
      @retry="state.load"
    />
    <template v-else>
      <p v-if="!state.items.value.length">这页还没有想吃的菜。</p>
      <ul v-else>
        <li v-for="dish in state.items.value" :key="dish.id">
          <DishLink :dish="dish">
            <strong>{{ dish.name }} · {{ formatPrice(dish.price) }}</strong>
            <p>{{ dish.diningHallName }} · {{ dish.stallName }}</p>
          </DishLink>
          <button
            type="button"
            class="favorite-dishes__assign"
            @click="toggleMembershipPanel(dish)"
          >
            {{ membershipDishId === dish.id ? '收起分组' : '分组' }}
          </button>
          <div
            v-if="membershipDishId === dish.id"
            class="favorite-dishes__memberships"
          >
            <p v-if="membershipLoading">正在读取分组…</p>
            <p v-else-if="!groups.length">还没有分组，先新建一个。</p>
            <label v-for="group in groups" :key="group.id">
              <input
                type="checkbox"
                :checked="membershipGroupIds.includes(group.id)"
                @change="toggleMembership(group, dish)"
              />
              {{ group.name }}
            </label>
          </div>
        </li>
      </ul>
      <PaginationControls
        v-if="state.page.value > 1 || state.total.value > state.size.value"
        :page="state.page.value"
        :total="state.total.value"
        :size="state.size.value"
        @change="state.page.value = $event"
      />
    </template>
  </main>
</template>

<style scoped>
.favorite-dishes {
  width: min(calc(100% - 2 * var(--zine-page-padding)), 640px);
  margin: var(--ft-space-6) auto;
}
.favorite-dishes ul {
  list-style: none;
  padding: 0;
}
.favorite-dishes li {
  border-bottom: 1px solid var(--ft-color-text);
  padding-bottom: 8px;
  margin-bottom: 8px;
}
.favorite-dishes li a {
  display: block;
  padding: 10px 4px;
  overflow-wrap: anywhere;
}
.favorite-dishes li p {
  margin: 4px 0 0;
}
.favorite-dishes__groups {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 12px 0;
}
.favorite-dishes__groups > button,
.favorite-dishes__group > button {
  border: 1px solid var(--ft-color-secondary);
  background: transparent;
  color: var(--ft-color-text);
  padding: 6px 10px;
  cursor: pointer;
}
.favorite-dishes__group,
.favorite-dishes__groups > button {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}
.favorite-dishes__group,
.favorite-dishes__groups > button:not(.favorite-dishes__create) {
  border: 1px solid var(--ft-color-secondary);
}
.favorite-dishes__group > button:first-child {
  border: 0;
}
.favorite-dishes__group.is-active,
.favorite-dishes__groups > button.is-active {
  border-color: var(--ft-color-primary);
  background: rgb(201 52 30 / 10%);
}
.favorite-dishes__group-action {
  border: 0 !important;
  font-size: 12px;
  color: var(--ft-color-primary) !important;
}
.favorite-dishes__group-action.is-danger {
  color: var(--ft-color-danger) !important;
}
.favorite-dishes__create {
  border-style: dashed !important;
}
.favorite-dishes__assign {
  border: 0;
  background: transparent;
  color: var(--ft-color-primary);
  cursor: pointer;
  text-decoration: underline;
}
.favorite-dishes__memberships {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding: 8px 4px;
  font-size: var(--ft-font-size-sm);
}
.favorite-dishes__memberships label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
</style>

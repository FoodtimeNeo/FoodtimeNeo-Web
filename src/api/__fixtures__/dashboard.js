const sample = {
  registeredUsers: 1248,
  onlineUsers: 86,
  reviews: 3862,
  replies: 5917,
  posts: 742,
  halls: 7,
  stalls: 46,
  dishes: 618,
  generatedAt: '2026-10-30T12:00:00Z',
  trend: [
    {
      day: '2026-10-24',
      newUsers: 7,
      newReviews: 68,
      newReplies: 104,
      newPosts: 12,
      onlinePeak: 91,
    },
    {
      day: '2026-10-25',
      newUsers: 9,
      newReviews: 75,
      newReplies: 118,
      newPosts: 15,
      onlinePeak: 96,
    },
    {
      day: '2026-10-26',
      newUsers: 6,
      newReviews: 61,
      newReplies: 97,
      newPosts: 11,
      onlinePeak: 88,
    },
    {
      day: '2026-10-27',
      newUsers: 12,
      newReviews: 88,
      newReplies: 143,
      newPosts: 19,
      onlinePeak: 112,
    },
    {
      day: '2026-10-28',
      newUsers: 8,
      newReviews: 79,
      newReplies: 126,
      newPosts: 16,
      onlinePeak: 105,
    },
    {
      day: '2026-10-29',
      newUsers: 11,
      newReviews: 95,
      newReplies: 158,
      newPosts: 22,
      onlinePeak: 127,
    },
    {
      day: '2026-10-30',
      newUsers: 10,
      newReviews: 92,
      newReplies: 151,
      newPosts: 24,
      onlinePeak: 119,
    },
  ],
};

export function dashboardFixture() {
  return JSON.parse(JSON.stringify(sample));
}

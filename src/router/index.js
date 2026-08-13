import { createRouter, createWebHashHistory } from 'vue-router';
import { useAuth } from '../stores/auth.js';

import BookingView from '../views/customer/BookingView.vue';
import TrackingView from '../views/customer/TrackingView.vue';
import AdminDashboard from '../views/admin/AdminDashboard.vue';
import SuperAdminDashboard from '../views/super-admin/SuperAdminDashboard.vue';
import LoginView from '../views/auth/LoginView.vue';

const routes = [
  {
    path: '/',
    name: 'Booking',
    component: BookingView,
    meta: { title: 'Book Luggage Delivery — BagTransit Bali' },
  },
  {
    path: '/track',
    name: 'Tracking',
    component: TrackingView,
    meta: { title: 'Track My Luggage — BagTransit Bali' },
  },
  {
    path: '/admin',
    name: 'AdminDashboard',
    component: AdminDashboard,
    meta: {
      title: 'Branch Operations — BagTransit Admin',
      requiresAuth: true,
      roles: ['admin', 'super_admin'],
    },
  },
  {
    path: '/super-admin',
    name: 'SuperAdminDashboard',
    component: SuperAdminDashboard,
    meta: {
      title: 'Super Admin Executive Dashboard — BagTransit',
      requiresAuth: true,
      roles: ['super_admin'],
    },
  },
  {
    path: '/login',
    name: 'Login',
    component: LoginView,
    meta: { title: 'Sign In / Role Switcher — BagTransit' },
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 };
  },
});

router.beforeEach((to, from, next) => {
  const { user } = useAuth();
  document.title = to.meta.title || 'BagTransit — Your Bags Move. You Explore.';

  if (to.meta.requiresAuth) {
    if (!user.value || user.value.role === 'customer') {
      return next({ name: 'Login', query: { redirect: to.fullPath } });
    }
    if (to.meta.roles && !to.meta.roles.includes(user.value.role)) {
      if (user.value.role === 'admin') {
        return next({ name: 'AdminDashboard' });
      }
      return next({ name: 'Booking' });
    }
  }
  next();
});

export default router;

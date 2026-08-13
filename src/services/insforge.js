/**
 * Insforge Client & Postgres BaaS Adapter
 * BagTransit (Your Bags Move. You Explore.)
 * 
 * Interacts with Insforge Postgres / Edge Functions.
 * Falls back gracefully to local RLS-enforced DB client.
 */

import { db } from './db.js';

export const insforge = {
  auth: {
    async getSession() {
      const sessionStr = localStorage.getItem('bagtransit_auth_session');
      return sessionStr ? JSON.parse(sessionStr) : null;
    },
    async setSession(user) {
      if (user) {
        localStorage.setItem('bagtransit_auth_session', JSON.stringify(user));
      } else {
        localStorage.removeItem('bagtransit_auth_session');
      }
    },
  },

  from(tableName) {
    return {
      select(columns = '*') {
        return {
          async eq(column, value) {
            if (tableName === 'branches') {
              return { data: db.getBranches().filter(b => b[column] === value), error: null };
            }
            if (tableName === 'pricing_zones') {
              return { data: db.getPricingZones().filter(z => z[column] === value), error: null };
            }
            if (tableName === 'bookings') {
              return { data: db.getBookings().filter(b => b[column] === value), error: null };
            }
            return { data: [], error: null };
          },
          async then(resolve) {
            if (tableName === 'branches') resolve({ data: db.getBranches(), error: null });
            else if (tableName === 'pricing_zones') resolve({ data: db.getPricingZones(), error: null });
            else if (tableName === 'couriers') resolve({ data: db.getCouriers(), error: null });
            else if (tableName === 'bookings') resolve({ data: db.getBookings(), error: null });
            else resolve({ data: [], error: null });
          },
        };
      },
      async insert(row) {
        if (tableName === 'bookings') {
          const created = db.createBooking(row);
          return { data: created, error: null };
        }
        return { data: row, error: null };
      },
      async update(updates) {
        return {
          async eq(column, value) {
            if (tableName === 'pricing_zones' && column === 'id') {
              const updated = db.updatePricingZone(value, updates);
              return { data: updated, error: null };
            }
            return { data: null, error: null };
          },
        };
      },
    };
  },
};

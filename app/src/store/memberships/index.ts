import { GymMembership, MembershipId } from '@/models/membership';
import { createAction, createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface MembershipsState {
  memberships: GymMembership[];
  isHydrated: boolean;
}

const initialState: MembershipsState = {
  memberships: [],
  isHydrated: false,
};

const membershipsSlice = createSlice({
  name: 'memberships',
  initialState,
  reducers: {
    setMemberships(state, action: PayloadAction<GymMembership[]>) {
      state.memberships = action.payload;
    },
    setMembershipsHydrated(state, action: PayloadAction<boolean>) {
      state.isHydrated = action.payload;
    },
    putMembership(state, action: PayloadAction<GymMembership>) {
      const index = state.memberships.findIndex((x) => x.id === action.payload.id);
      if (index === -1) {
        state.memberships.push(action.payload);
      } else {
        state.memberships[index] = action.payload;
      }
    },
    removeMembership(state, action: PayloadAction<MembershipId>) {
      state.memberships = state.memberships.filter((x) => x.id !== action.payload);
    },
  },
  selectors: {
    selectMemberships: (state: MembershipsState) => state.memberships,
  },
});

export const initializeMembershipsStateSlice = createAction('initializeMembershipsStateSlice');

export const { setMemberships, setMembershipsHydrated, putMembership, removeMembership } = membershipsSlice.actions;

export const { selectMemberships } = membershipsSlice.selectors;

export const membershipsReducer = membershipsSlice.reducer;

import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { ApiError, apiGet, apiPost, getErrorMessage } from "@/lib/api";

/**
 * Who is signed in. The sign-in token itself is NOT here: it lives in an HttpOnly cookie that
 * JavaScript cannot read. Redux only knows whether the browser is signed in and the visitor's saved
 * details (used to pre-fill the order form).
 */

export type VisitorStatus = "checking" | "signedOut" | "signedIn" | "error";

export interface VisitorProfile {
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  city: string;
}

/** Kept so older imports keep working. */
export type VisitorInfo = VisitorProfile;

export interface RegisterInput {
  firstName: string;
  middleName: string;
  lastName: string;
  age: number;
  email: string;
  phone: string;
  country: string;
  city: string;
  consent: boolean;
}

export type FieldErrors = Partial<Record<keyof RegisterInput, string[]>>;

export interface RegisterFailure {
  message: string;
  fieldErrors: FieldErrors;
}

interface RestoreFailure {
  /** true when the server says nobody is signed in (as opposed to a network problem) */
  unauthorized: boolean;
  message: string;
}

export interface VisitorState {
  status: VisitorStatus;
  visitor: VisitorProfile | null;
  restoring: boolean;
  error: string | null;
}

const initialState: VisitorState = {
  status: "checking",
  visitor: null,
  restoring: false,
  error: null,
};

type WithVisitor = { visitor: VisitorState };

type MeResponse = Partial<VisitorProfile> & {
  id: number;
  firstName: string;
  lastName: string;
};

async function fetchProfile(signal?: AbortSignal): Promise<VisitorProfile> {
  const me = await apiGet<MeResponse>("/visitors/me/", signal);
  return {
    firstName: me.firstName,
    middleName: me.middleName ?? "",
    lastName: me.lastName,
    email: me.email ?? "",
    phone: me.phone ?? "",
    country: me.country ?? "",
    city: me.city ?? "",
  };
}

/** Asks the server who is signed in (the browser sends its cookie automatically). */
export const restoreSession = createAsyncThunk<
  VisitorProfile,
  void,
  { rejectValue: RestoreFailure }
>(
  "visitor/restoreSession",
  async (_, { rejectWithValue, signal }) => {
    try {
      return await fetchProfile(signal);
    } catch (error) {
      return rejectWithValue({
        unauthorized:
          error instanceof ApiError &&
          (error.status === 401 || error.status === 403),
        message: getErrorMessage(error),
      });
    }
  },
  {
    // Safe to call twice (React Strict Mode runs effects twice in development).
    condition: (_, { getState }) => {
      const { restoring, status } = (getState() as WithVisitor).visitor;
      return !restoring && status !== "signedIn";
    },
  },
);

function toRegisterFailure(error: unknown): RegisterFailure {
  if (error instanceof ApiError) {
    if (error.status === 429) {
      return {
        message: "Too many attempts. Please wait a while and try again.",
        fieldErrors: {},
      };
    }

    if (error.status === 400 && error.data && typeof error.data === "object") {
      const fieldErrors: FieldErrors = {};
      for (const [key, value] of Object.entries(error.data)) {
        if (Array.isArray(value) && value.every((v) => typeof v === "string")) {
          fieldErrors[key as keyof RegisterInput] = value as string[];
        }
      }
      return {
        message: "Please check the highlighted fields.",
        fieldErrors,
      };
    }
  }

  return { message: getErrorMessage(error), fieldErrors: {} };
}

/**
 * Sends the form. On success the server sets the HttpOnly cookie, then we load the visitor's SAVED
 * details from /me/ (for a returning visitor these can differ from what was just typed).
 */
export const registerVisitor = createAsyncThunk<
  VisitorProfile,
  RegisterInput,
  { rejectValue: RegisterFailure }
>("visitor/register", async (input, { rejectWithValue }) => {
  let echoed: Pick<VisitorProfile, "firstName" | "middleName" | "lastName">;

  try {
    const response = await apiPost<{ visitor: typeof echoed }>(
      "/visitors/register/",
      input,
    );
    echoed = response.visitor;
  } catch (error) {
    return rejectWithValue(toRegisterFailure(error));
  }

  try {
    return await fetchProfile();
  } catch {
    // The visitor IS registered; only the profile lookup failed. Fall back to what was typed.
    return {
      ...echoed,
      email: input.email.trim().toLowerCase(),
      phone: input.phone,
      country: input.country,
      city: input.city,
    };
  }
});

/** Asks the server to delete this browser's token and clear the cookie. Always ends signed out. */
export const logoutVisitor = createAsyncThunk<void, void>(
  "visitor/logout",
  async () => {
    try {
      await apiPost<void>("/visitors/logout/");
    } catch {
      // Nothing useful to do: the screen goes back to the form either way.
    }
  },
);

const visitorSlice = createSlice({
  name: "visitor",
  initialState,
  reducers: {
    /** Called when any API request answers 401. */
    sessionExpired(state) {
      state.status = "signedOut";
      state.visitor = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(restoreSession.pending, (state) => {
        state.restoring = true;
        state.error = null;
        if (state.status === "error") state.status = "checking";
      })
      .addCase(restoreSession.fulfilled, (state, action) => {
        state.restoring = false;
        state.status = "signedIn";
        state.visitor = action.payload;
      })
      .addCase(restoreSession.rejected, (state, action) => {
        state.restoring = false;
        if (action.payload?.unauthorized) {
          state.status = "signedOut";
          state.visitor = null;
        } else {
          state.status = "error";
          state.error =
            action.payload?.message ??
            action.error.message ??
            "Could not check your session.";
        }
      })
      .addCase(registerVisitor.fulfilled, (state, action) => {
        state.status = "signedIn";
        state.visitor = action.payload;
        state.error = null;
      })
      .addCase(logoutVisitor.fulfilled, (state) => {
        state.status = "signedOut";
        state.visitor = null;
      });
  },
});

export const { sessionExpired } = visitorSlice.actions;
export default visitorSlice.reducer;

// Selectors
export const selectVisitorStatus = (state: WithVisitor) => state.visitor.status;
export const selectVisitor = (state: WithVisitor) => state.visitor.visitor;
export const selectVisitorError = (state: WithVisitor) => state.visitor.error;

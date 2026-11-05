import { useDispatch, useSelector } from "react-redux";

import type { AppDispatch, RootState } from "./index";

// Typed versions of the Redux hooks. If you already have these, use yours and skip this file.
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();

import { useEffect, useState } from "react";

export function useCubit<T>(cubit: { getState: () => T; subscribe: (listener: (state: T) => void) => () => void }) {
  const [state, setState] = useState(cubit.getState());

  useEffect(() => {
    return cubit.subscribe((newState) => {
      setState(newState);
    });
  }, [cubit]);

  return state;
}

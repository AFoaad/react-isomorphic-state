//TODO: a research needed to understand the side effect of ignoring `React` namespace.
import * as R from "react";
import { injectState, updateCache } from "./cache";
import {
  ConsumerResult,
  ResultProps,
  ConsumerProps,
  ItratableSubscriber,
  UpdatedCallback,
} from "./interface";
import { isImmutable, fromJS, Map } from "immutable";

//  initialize provider.
export const stateConsumer = <T>({
  id,
  initialState,
}: ConsumerProps<T>): ResultProps<T> => {
  let listeners: ItratableSubscriber<T>[] = [];

  let setStateDone = false;
  let cache = Map<string, any>();

  const initState = isImmutable(initialState)
    ? initialState
    : fromJS(initialState);

  // Set function.
  // eslint-disable-next-line
  const callListeners = (
    newValue: Iterable<T>,
    callback: ItratableSubscriber<T>
  ) => {
    // update the cash
    // @ts-ignore
    cache = updateCache(id, newValue, cache);

    // notify caller subscriber direct.
    if (callback) {
      callback(newValue);
    }

    // Let subscribers know value did change async.
    setTimeout(() => {
      // call subscribers which are not the caller.
      listeners.forEach((fn: ItratableSubscriber<T>) => fn(newValue));
    });
  };

  //TODO: Check `useConsumerState` re-execution.
  const useConsumerState = (): ConsumerResult<T> => {
    const [state, setState] = R.useState<Iterable<T>>(initState);

    R.useEffect(() => {
      // If `id` does not exist, add new entry state and added it chache.
      if (!cache.has(id)) {
        cache = injectState(id, initState, cache);
      }

      if (!setStateDone) {
        setState(cache.get(id) as Iterable<T>);
        setStateDone = true;
      }

      listeners.push(setState);

      return () => {
        // eslint-disable-next-line
        listeners = listeners.filter((f) => f !== setState);
      };
    }, [setState, id, initState, setStateDone]);

    // update state and call Listeners.
    const updater = R.useCallback(
      (preStateOrNextValue: Iterable<T> | UpdatedCallback<T>) => {
        // support previous as argument to new value.
        const newValue: Iterable<T> =
          preStateOrNextValue instanceof Function
            ? preStateOrNextValue(state)
            : preStateOrNextValue;

        callListeners(newValue, setState);
      },
      [setState, state]
    );

    return [state, updater, cache];
  };

  return {
    useConsumerState,
    getCach: () => cache,
  };
};

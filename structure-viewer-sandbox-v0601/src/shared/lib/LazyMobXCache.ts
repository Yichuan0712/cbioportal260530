export type CacheData<D, M = any> =
    | {
          status: 'complete' | 'error';
          data: null;
          meta?: M;
      }
    | {
          status: 'complete';
          data: D;
          meta?: M;
      };

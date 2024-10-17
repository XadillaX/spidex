import { Spidex } from './spidex';

const spidex = new Spidex();

const e = {
  get: spidex.get.bind(spidex) as typeof spidex.get,
  post: spidex.post.bind(spidex) as typeof spidex.post,
  put: spidex.put.bind(spidex) as typeof spidex.put,
  delete: spidex.delete.bind(spidex) as typeof spidex.delete,
  method: spidex.method.bind(spidex) as typeof spidex.method,
  hessianV2: spidex.hessianV2.bind(spidex) as typeof spidex.hessianV2,

  _combineHeader:
    spidex._combineHeader.bind(spidex) as typeof spidex._combineHeader,
};

export = e;

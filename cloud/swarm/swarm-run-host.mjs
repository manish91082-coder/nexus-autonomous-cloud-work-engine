import { SwarmRunDO } from "./swarm-run-do.mjs";
export { SwarmRunDO };

export default {
  async fetch() {
    return new Response("Not Found", { status: 404 });
  }
};

import { createHash } from "node:crypto";
import { writeSceneBundle } from "../../../packages/quantum-scene/bundle";
import { ute2SceneFromResult, type Ute2SceneKind } from "../../../packages/quantum-scene/ute2";
import { LandauRunStore } from "./landau-runs";
import { BdGSectorRunStore } from "./bdg-sector-runs";
import { LatticePairingRunStore } from "./lattice-pairing-runs";
import { Ute2EdgeRunStore } from "./ute2-edge-runs";

const digest=async(bytes:Uint8Array)=>createHash("sha256").update(bytes).digest("hex");

/** Source access is reverified on every export, including the edge run's bulk parent. */
export class Ute2SceneProducer {
  constructor(private readonly landau:LandauRunStore,private readonly bdg:BdGSectorRunStore,
    private readonly lattice:LatticePairingRunStore,private readonly edge:Ute2EdgeRunStore) {}

  async build(kind:Ute2SceneKind,runId:string) {
    if(!/^[A-Za-z0-9_-]{1,100}$/.test(runId))throw new Error("Invalid UTe2 source run ID");
    if(!["landau","bdg","lattice","edge"].includes(kind))throw new Error("Unsupported UTe2 scene kind");
    if(kind==="landau")return ute2SceneFromResult({kind,...await this.landau.getVerified(runId)},digest);
    if(kind==="bdg")return ute2SceneFromResult({kind,...await this.bdg.getVerified(runId)},digest);
    if(kind==="lattice")return ute2SceneFromResult({kind,...await this.lattice.getVerified(runId)},digest);
    return ute2SceneFromResult({kind:"edge",...await this.edge.getVerified(runId)},digest);
  }

  async export(kind:Ute2SceneKind,runId:string,parent:string):Promise<string> {
    return writeSceneBundle(await this.build(kind,runId),parent);
  }
}

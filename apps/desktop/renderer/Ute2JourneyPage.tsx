import React from "react";
import {Ute2LandauPage} from "./Ute2LandauPage";
import {Ute2BdGSectorPage} from "./Ute2BdGSectorPage";
import {Ute2LatticePairingPage} from "./Ute2LatticePairingPage";
import {Ute2TopologyPage} from "./Ute2TopologyPage";
import {Ute2EdgePage} from "./Ute2EdgePage";

const sections=[
  ["ute2-landau","Landau equilibrium"],
  ["ute2-bdg","Reduced BdG"],
  ["ute2-lattice","Lattice pairing"],
  ["ute2-bulk","Qualified bulk"],
  ["ute2-edge","Finite strip"],
] as const;
export function Ute2JourneyPage({ready}:{ready:boolean}){
  return <div>
    <nav className="panel dynamics-actions" aria-label="UTe₂ journey sections">
      {sections.map(([id,label])=><button type="button" key={id}
        onClick={()=>document.getElementById(id)?.scrollIntoView({behavior:"smooth",block:"start"})}>{label}</button>)}
    </nav>
    <div id="ute2-landau"><Ute2LandauPage ready={ready}/></div>
    <div id="ute2-bdg"><Ute2BdGSectorPage ready={ready}/></div>
    <div id="ute2-lattice"><Ute2LatticePairingPage ready={ready}/></div>
    <div id="ute2-bulk"><Ute2TopologyPage ready={ready}/></div>
    <div id="ute2-edge"><Ute2EdgePage ready={ready}/></div>
  </div>;
}

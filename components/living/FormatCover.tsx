import type { FormatKey } from "@/lib/formats";

/**
 * A distinct little "cover" for each format — the portrait in the
 * character-select rail. Not the real story (that's the big preview); a
 * recognisable emblem of the medium so the choice reads at a glance.
 * Pure SVG, ~120×160.
 */
const PAPER = "#F4EEE4", INK = "#2E2A24", LINE = "#D3Cabb";

export function FormatCover({ k }: { k: FormatKey }) {
  const V = (kids: React.ReactNode, bg = PAPER) => (
    <svg viewBox="0 0 120 160" className="fs-cover" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect width="120" height="160" fill={bg} />{kids}
    </svg>
  );
  const line = (x: number, y: number, w: number, c = INK, h = 3, o = 0.85) =>
    <rect x={x} y={y} width={w} height={h} rx={h / 2} fill={c} opacity={o} />;

  switch (k) {
    case "standard":
      return V(<>{line(34, 30, 52, INK, 5)}{[52, 66, 80, 94, 108, 122].map((y, i) => line(24, y, i % 2 ? 62 : 72, LINE, 4, 1))}</>);
    case "scrapbook":
      return V(<>
        <g transform="rotate(-7 42 56)"><rect x="16" y="34" width="52" height="44" rx="2" fill="#fff" stroke={LINE}/><rect x="34" y="30" width="18" height="7" fill="#C9822F" opacity=".7"/>{line(24,48,34,LINE,3,1)}{line(24,56,30,LINE,3,1)}</g>
        <g transform="rotate(8 78 104)"><rect x="52" y="82" width="52" height="44" rx="2" fill="#fff" stroke={LINE}/><rect x="76" y="94" width="20" height="20" fill="#2E8B8B" opacity=".5"/>{line(58,90,30,LINE,3,1)}</g>
      </>);
    case "letter":
      return V(<>{line(24, 30, 26, INK, 4)}{[46,58,70,82,94,106].map((y,i)=>line(24,y,i%3?78:60,LINE,3,1))}<path d="M24 126c6-6 12 5 20 0s10-6 16 0" fill="none" stroke="#3B5168" strokeWidth="2.5"/></>);
    case "poster":
      return V(<><rect x="16" y="30" width="88" height="40" rx="2" fill="#D23B2E" opacity=".9"/>{line(30,92,60,INK,5)}{line(38,108,44,LINE,4,1)}</>);
    case "ticket":
      return V(<>{[34,66,98].map((y)=>(<g key={y}><rect x="14" y={y} width="92" height="24" rx="3" fill="#fff" stroke={LINE}/><line x1="40" y1={y+4} x2="40" y2={y+20} stroke={LINE} strokeDasharray="2 2"/><rect x="20" y={y+9} width="14" height="6" rx="1" fill="#2E8B8B" opacity=".8"/>{line(48,y+10,46,LINE,3,1)}</g>))}</>);
    case "notebook":
      return V(<>
        {[0,1,2,3,4,5,6,7].map(i=><line key={"h"+i} x1="0" y1={20*i} x2="120" y2={20*i} stroke={LINE} strokeWidth="1"/>)}
        {[0,1,2,3,4,5].map(i=><line key={"v"+i} x1={20*i} y1="0" x2={20*i} y2="160" stroke={LINE} strokeWidth="1"/>)}
        <line x1="26" y1="0" x2="26" y2="160" stroke="#3FA05C" strokeWidth="2"/>
        {line(34,34,60,INK,3,1)}{line(34,44,48,INK,3,1)}<circle cx="92" cy="80" r="9" fill="none" stroke="#3FA05C"/>
      </>);
    case "gallery":
      return V(<><line x1="10" y1="58" x2="110" y2="58" stroke={LINE}/><rect x="20" y="34" width="34" height="34" fill="#fff" stroke={INK}/><rect x="66" y="34" width="34" height="34" fill="#fff" stroke={INK}/><rect x="30" y="44" width="14" height="14" fill="#7A5C8A" opacity=".5"/>{line(24,86,72,LINE,3,1)}{line(24,96,52,LINE,3,1)}</>);
    case "film":
      return V(<><rect width="120" height="22" fill="#000"/><rect y="138" width="120" height="22" fill="#000"/><rect x="0" y="22" width="12" height="116" fill="#000"/>{[30,50,70,90,110].map(y=><rect key={y} x="3" y={y} width="6" height="8" fill="#333"/>)}{line(28,92,64,"#fff",4,.9)}{line(40,104,40,"#fff",3,.6)}</>, "#0c0c0e");
    case "ransom":
      return V(<>{[[18,34,-8,"#2E2A24"],[54,30,7,"#D23B2E"],[30,60,-4,"#2E2A24"],[62,66,9,"#2E2A24"],[24,92,-6,"#D23B2E"],[58,98,5,"#2E2A24"]].map((b,i)=>{const[x,y,r,c]=b as [number,number,number,string];return <g key={i} transform={`rotate(${r} ${x} ${y})`}><rect x={x} y={y} width="34" height="16" rx="1" fill="#fff" stroke={LINE}/><rect x={x+4} y={y+4} width="26" height="8" fill={c} opacity={c==="#D23B2E"?.85:.75}/></g>;})}</>);
    case "marquee":
      return V(<><rect x="16" y="60" width="88" height="40" rx="20" fill="none" stroke="#31C8D8" strokeWidth="2" opacity=".9"/>{[36,52,68,84].map(x=><circle key={x} cx={x} cy="80" r="3" fill="#31C8D8"/>)}<rect x="16" y="60" width="88" height="40" rx="20" fill="#31C8D8" opacity=".12"/></>, "#0b0a10");
    case "postcard":
      return V(<><rect x="12" y="30" width="96" height="100" rx="3" fill="#fff" stroke={LINE}/><rect x="82" y="40" width="16" height="16" fill="#A66A3B" opacity=".7"/><circle cx="90" cy="70" r="9" fill="none" stroke={LINE} strokeDasharray="2 2"/><line x1="60" y1="40" x2="60" y2="120" stroke={LINE} strokeDasharray="3 3"/>{[52,64,76,88].map(y=>line(20,y,32,LINE,3,1)).map((el,i)=><g key={i}>{el}</g>)}</>);
    default:
      return V(<circle cx="60" cy="80" r="24" fill="none" stroke={INK} strokeWidth="3"/>);
  }
}

export default FormatCover;

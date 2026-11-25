"""Paper-craft layered SVG cutout generator & WebP rasterizer for 星邮岛 · 折叠图志."""
import os, re, math, tempfile, subprocess
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SVG_DIR = os.path.join(ROOT, 'art', 'svg')
OUT_DIR = os.path.join(ROOT, 'art')
CHROME = '/usr/bin/google-chrome'
os.makedirs(SVG_DIR, exist_ok=True)

def paper_filter(seed=3, disp=2.5):
    return f'''<filter id="p" x="-6%" y="-6%" width="112%" height="112%" color-interpolation-filters="sRGB">
<feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="{seed}" result="w"/>
<feDisplacementMap in="SourceGraphic" in2="w" scale="{disp}" xChannelSelector="R" yChannelSelector="G" result="d"/>
<feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="3" seed="{seed+7}" result="g"/>
<feColorMatrix in="g" type="matrix" values="0 0 0 0 .18  0 0 0 0 .14  0 0 0 0 .1  0.22 0 0 0 -0.09" result="gr"/>
<feComposite in="gr" in2="d" operator="in" result="tex"/>
<feMerge><feMergeNode in="d"/><feMergeNode in="tex"/></feMerge>
</filter>
<filter id="s" x="-12%" y="-12%" width="124%" height="128%"><feDropShadow dx="0" dy="5" stdDeviation="4" flood-color="#14201c" flood-opacity=".32"/></filter>
<filter id="glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="12" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'''

GOLD = 'fill="none" stroke="#e4b95b" stroke-width="3.2" stroke-dasharray="8 6" stroke-linecap="round"'
CREAM = 'fill="none" stroke="#f7eed8" stroke-opacity=".75" stroke-width="2.8" stroke-dasharray="7 6" stroke-linecap="round"'
INK = 'fill="none" stroke="#24312d" stroke-opacity=".35" stroke-width="2.5"'

def save_svg(name, w, h, body, seed=3, disp=2.5):
    txt = f'''<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">
<defs>{paper_filter(seed, disp)}</defs>
<g filter="url(#p)">{body}</g>
</svg>'''
    with open(os.path.join(SVG_DIR, f'{name}.svg'), 'w', encoding='utf-8') as f:
        f.write(txt)
    return name, w, h, txt

def build_all():
    items = []
    # 1. Fox postman Aju
    items.append(save_svg('fox', 360, 440, f'''
<g filter="url(#s)">
 <path d="M90,335 Q25,310 38,242 Q55,205 112,248 Q128,275 120,335 Z" fill="#d96b2b"/>
 <path d="M38,242 Q52,216 80,235 Q62,258 45,274 Z" fill="#f7eed8"/>
 <rect x="148" y="340" width="28" height="82" rx="12" fill="#5e321a"/>
 <rect x="196" y="340" width="28" height="82" rx="12" fill="#5e321a"/>
 <path d="M126,232 Q126,188 186,188 Q246,188 246,232 L236,356 Q186,374 136,356 Z" fill="#df7434"/>
 <ellipse cx="186" cy="296" rx="34" ry="52" fill="#f7eed8"/>
 <path d="M132,208 L244,292" stroke="#4f6d4a" stroke-width="14" stroke-linecap="round"/>
 <rect x="202" y="274" width="66" height="54" rx="10" fill="#5d7e55" stroke="#2d422a" stroke-width="3"/>
 <path d="M202,292 L235,310 L268,292" fill="none" stroke="#e4b95b" stroke-width="4"/>
 <circle cx="235" cy="308" r="5" fill="#f7d674"/>
 <path d="M116,204 Q186,230 252,204 L248,230 Q186,252 120,230 Z" fill="#8b3a2b"/>
 <path d="M122,216 Q186,240 246,216" {GOLD}/>
 <polygon points="122,126 108,42 164,96" fill="#df7434"/><polygon points="126,112 118,62 152,96" fill="#4a2c20"/>
 <polygon points="250,126 264,42 208,96" fill="#df7434"/><polygon points="246,112 254,62 220,96" fill="#4a2c20"/>
 <ellipse cx="186" cy="144" rx="74" ry="62" fill="#e47c3c"/>
 <path d="M114,154 Q148,186 186,186 Q224,186 258,154 Q244,202 186,204 Q128,202 114,154 Z" fill="#f7eed8"/>
 <circle cx="158" cy="138" r="9" fill="#1e2422"/><circle cx="161" cy="135" r="3" fill="#fff"/>
 <circle cx="214" cy="138" r="9" fill="#1e2422"/><circle cx="217" cy="135" r="3" fill="#fff"/>
 <ellipse cx="186" cy="158" rx="11" ry="8" fill="#2b201a"/>
 <path d="M174,170 Q186,180 198,170" fill="none" stroke="#2b201a" stroke-width="3.5" stroke-linecap="round"/>
 <g transform="translate(262,188) rotate(-14)" filter="url(#glow)">
  <rect x="0" y="0" width="66" height="46" rx="6" fill="#fff8df" stroke="#e4b95b" stroke-width="3"/>
  <path d="M2,4 L33,26 L64,4" fill="none" stroke="#d49b35" stroke-width="3"/>
  <polygon points="33,14 36,22 44,22 38,27 40,35 33,30 26,35 28,27 22,22 30,22" fill="#f0b93d"/>
 </g>
</g>''', seed=11, disp=2))

    # 2. Harbor Post Office
    items.append(save_svg('postoffice', 680, 620, f'''
<g filter="url(#s)">
 <rect x="110" y="270" width="460" height="330" rx="8" fill="#efe2c8"/>
 <rect x="110" y="510" width="460" height="90" fill="#7d593c"/>
 <rect x="148" y="340" width="120" height="120" rx="6" fill="#ffe08a" stroke="#5b3e28" stroke-width="10"/>
 <path d="M208,340 L208,460 M148,400 L268,400" stroke="#5b3e28" stroke-width="8"/>
 <rect x="330" y="350" width="106" height="250" rx="8" fill="#c8a06e" stroke="#5b3e28" stroke-width="8"/>
 <rect x="348" y="370" width="70" height="86" rx="4" fill="#ffe6a3"/>
 <path d="M383,370 L383,456 M348,413 L418,413" stroke="#5b3e28" stroke-width="5"/>
 <rect x="466" y="355" width="76" height="96" rx="6" fill="#ffe08a" stroke="#5b3e28" stroke-width="8"/>
 <rect x="150" y="90" width="54" height="130" rx="4" fill="#6b4b35"/>
 <polygon points="56,288 340,68 624,288" fill="#8b3a34"/>
 <polygon points="88,276 340,94 592,276" fill="#9d453e"/>
 <path d="M98,272 L340,104 L582,272" {GOLD}/>
 <rect x="234" y="214" width="212" height="62" rx="10" fill="#27483f" stroke="#e4b95b" stroke-width="5"/>
 <text x="340" y="256" font-family="serif" font-size="34" font-weight="700" fill="#f7e3a6" text-anchor="middle" letter-spacing="4">星邮港局</text>
</g>''', seed=12))

    # 3. Brass Postbox (Ch1 Landmark)
    items.append(save_svg('postbox', 260, 400, f'''
<g filter="url(#s)">
 <rect x="64" y="346" width="26" height="44" rx="6" fill="#c99a3a"/>
 <rect x="170" y="346" width="26" height="44" rx="6" fill="#c99a3a"/>
 <path d="M52,356 L52,130 Q52,38 130,38 Q208,38 208,130 L208,356 Z" fill="#9c3830"/>
 <path d="M66,342 L66,134 Q66,54 130,54 Q194,54 194,134 L194,342 Z" fill="none" stroke="#e8bd5e" stroke-width="7"/>
 <rect x="82" y="114" width="96" height="22" rx="10" fill="#1b2623" stroke="#e8bd5e" stroke-width="4"/>
 <polygon points="130,174 139,198 164,198 144,212 151,236 130,222 109,236 116,212 96,198 121,198" fill="#f8d775" filter="url(#glow)"/>
 <text x="130" y="294" font-family="serif" font-size="30" font-weight="700" fill="#f7e3a6" text-anchor="middle">星邮</text>
 <rect x="44" y="338" width="172" height="24" rx="8" fill="#d9ad4e"/>
</g>''', seed=13, disp=2))

    # 4. Sailboat
    items.append(save_svg('sailboat', 520, 480, f'''
<g filter="url(#s)">
 <rect x="248" y="36" width="12" height="320" rx="5" fill="#5e3d28"/>
 <polygon points="244,60 244,314 96,314" fill="#f6ebd3"/>
 <polygon points="264,84 264,314 404,314" fill="#e9d8b4"/>
 <path d="M244,86 L124,302 M264,110 L380,302" {INK}/>
 <path d="M254,36 L316,52 L254,68 Z" fill="#2b5a68"/>
 <path d="M46,336 L474,336 L422,438 Q260,456 98,438 Z" fill="#6f4a32"/>
 <path d="M62,364 L458,364" stroke="#e4b95b" stroke-width="7"/>
 <path d="M84,394 L436,394" {CREAM}/>
</g>''', seed=14))

    # 5. Paper Mist Cloud
    items.append(save_svg('mist_cloud', 560, 220, f'''
<g filter="url(#s)">
 <path d="M44,196 Q20,140 82,126 Q104,54 196,68 Q264,16 352,66 Q436,46 476,118 Q536,128 518,196 Z" fill="#e7efe9" opacity=".92"/>
 <path d="M74,180 Q68,144 114,138 Q138,88 206,96 Q268,54 338,94 Q404,80 436,134 Q484,142 478,180" {INK}/>
</g>''', seed=15))

    # 6. Ginkgo Tree
    leaves = ''
    for cx, cy, r, col in [(220,170,115,'#eab63e'),(130,220,86,'#f3c95b'),(310,215,90,'#df9e2c'),(220,110,88,'#f7d979'),(165,135,72,'#e7ac33'),(280,145,75,'#f4ca5c')]:
        leaves += f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{col}"/>'
    items.append(save_svg('ginkgo_tree', 440, 560, f'''
<g filter="url(#s)">
 <path d="M196,548 L206,270 L234,270 L244,548 Z" fill="#66452e"/>
 <path d="M210,330 L150,256 M230,320 L292,248" stroke="#66452e" stroke-width="18" stroke-linecap="round"/>
 {leaves}
 <circle cx="220" cy="175" r="96" {CREAM}/>
</g>''', seed=16))

    # 7. Tea Pavilion
    items.append(save_svg('teahouse', 540, 520, f'''
<g filter="url(#s)">
 <rect x="96" y="458" width="348" height="44" rx="8" fill="#7c6c5d"/>
 <rect x="130" y="250" width="280" height="214" fill="#e9dac0"/>
 <rect x="164" y="286" width="90" height="148" rx="4" fill="#ffe18c" stroke="#5c3f2a" stroke-width="8"/>
 <rect x="286" y="286" width="90" height="106" rx="4" fill="#ffe18c" stroke="#5c3f2a" stroke-width="8"/>
 <path d="M209,286 L209,434 M164,336 L254,336 M164,386 L254,386 M331,286 L331,392 M286,339 L376,339" stroke="#5c3f2a" stroke-width="5"/>
 <path d="M40,264 Q270,224 500,264 L350,86 Q270,58 190,86 Z" fill="#8f6b43"/>
 <path d="M74,250 L204,104 L336,104 L466,250" {GOLD}/>
 <rect x="242" y="64" width="56" height="22" rx="8" fill="#5c3f2a"/>
</g>''', seed=17))

    # 8. Stone Lantern (Ch2 Landmark)
    items.append(save_svg('stone_lantern', 260, 420, f'''
<g filter="url(#s)">
 <ellipse cx="130" cy="396" rx="74" ry="18" fill="#7c7a72"/>
 <rect x="104" y="248" width="52" height="146" rx="10" fill="#9a988e"/>
 <rect x="68" y="228" width="124" height="26" rx="8" fill="#86847b"/>
 <rect x="82" y="132" width="96" height="98" rx="8" fill="#a8a59a"/>
 <rect x="98" y="148" width="64" height="66" rx="6" fill="#ffe285" filter="url(#glow)"/>
 <path d="M130,148 L130,214 M98,181 L162,181" stroke="#6f6d65" stroke-width="5"/>
 <path d="M36,142 Q130,52 224,142 Z" fill="#858379"/>
 <path d="M62,130 Q130,72 198,130" {CREAM}/>
 <circle cx="130" cy="64" r="18" fill="#9c9a90"/>
</g>''', seed=18, disp=2))

    # 9. Bridge Gate & Suspension Bridge
    planks = ''.join(f'<rect x="{190+i*42}" y="{352+int(24*math.sin(i/13*math.pi))}" width="34" height="22" rx="4" fill="#9c734b" stroke="#583c24" stroke-width="3"/>' for i in range(14))
    items.append(save_svg('bridge_gate', 860, 520, f'''
<g filter="url(#s)">
 <rect x="74" y="94" width="34" height="412" rx="8" fill="#6b482e"/>
 <rect x="218" y="94" width="34" height="412" rx="8" fill="#6b482e"/>
 <rect x="44" y="76" width="238" height="36" rx="10" fill="#7c5436"/>
 <rect x="760" y="210" width="28" height="270" rx="8" fill="#6b482e"/>
 <path d="M236,194 Q510,368 774,244" fill="none" stroke="#c9a56e" stroke-width="10"/>
 <path d="M236,274 Q510,418 774,316" fill="none" stroke="#c9a56e" stroke-width="8"/>
 {planks}
 <circle cx="380" cy="340" r="14" fill="#ffe082" filter="url(#glow)"/>
 <circle cx="560" cy="356" r="14" fill="#ffe082" filter="url(#glow)"/>
 <circle cx="700" cy="316" r="14" fill="#ffe082" filter="url(#glow)"/>
</g>''', seed=19))

    # 10. Brass Wind Chime (Ch3 Landmark)
    items.append(save_svg('chime', 240, 380, f'''
<g filter="url(#s)">
 <rect x="38" y="34" width="164" height="24" rx="10" fill="#6b482e"/>
 <ellipse cx="120" cy="86" rx="56" ry="16" fill="#d9ad4e"/>
 <rect x="78" y="98" width="16" height="150" rx="8" fill="#f0c869"/>
 <rect x="112" y="98" width="16" height="186" rx="8" fill="#e2b34c"/>
 <rect x="146" y="98" width="16" height="134" rx="8" fill="#f0c869"/>
 <line x1="120" y1="284" x2="120" y2="330" stroke="#f7eed8" stroke-width="3"/>
 <polygon points="120,318 142,344 120,368 98,344" fill="#ffe285" filter="url(#glow)"/>
</g>''', seed=20, disp=1.5))

    # 11. Spruce Pine
    items.append(save_svg('spruce', 320, 580, f'''
<g filter="url(#s)">
 <rect x="144" y="454" width="32" height="116" rx="6" fill="#4f3524"/>
 <polygon points="160,248 296,478 24,478" fill="#234d44"/>
 <polygon points="160,138 268,348 52,348" fill="#2d5f54"/>
 <polygon points="160,34 236,214 84,214" fill="#3a7265"/>
 <path d="M56,460 L160,276 L264,460" {CREAM}/>
</g>''', seed=21))

    # 12. Glass Conservatory (Ch4)
    ribs = ''.join(f'<line x1="{120+i*96}" y1="154" x2="{120+i*96}" y2="516" stroke="#2c3e4f" stroke-width="10"/>' for i in range(6))
    items.append(save_svg('conservatory', 720, 540, f'''
<g filter="url(#s)">
 <path d="M68,516 L68,248 Q68,66 360,66 Q652,66 652,248 L652,516 Z" fill="#385b78" fill-opacity=".78" stroke="#263747" stroke-width="16"/>
 <path d="M96,506 L96,252 Q96,94 360,94 Q624,94 624,252 L624,506 Z" fill="#639fb6" fill-opacity=".35"/>
 {ribs}
 <line x1="68" y1="254" x2="652" y2="254" stroke="#2c3e4f" stroke-width="12"/>
 <line x1="68" y1="384" x2="652" y2="384" stroke="#2c3e4f" stroke-width="10"/>
 <path d="M294,516 L294,352 Q294,288 360,288 Q426,288 426,352 L426,516 Z" fill="#233647" fill-opacity=".65" stroke="#e4b95b" stroke-width="6"/>
 <circle cx="360" cy="48" r="14" fill="#e4b95b"/>
</g>''', seed=22, disp=2))

    # 13. Luminous Moonflower (Ch4 Landmark)
    items.append(save_svg('moonflower', 280, 360, f'''
<g filter="url(#s)">
 <path d="M140,348 Q128,264 140,188" fill="none" stroke="#477a6c" stroke-width="12" stroke-linecap="round"/>
 <path d="M138,290 Q74,252 64,200 Q114,218 140,276 Z" fill="#3b6e61"/>
 <path d="M142,272 Q206,236 216,184 Q166,204 140,262 Z" fill="#4f8878"/>
 <g filter="url(#glow)">
  <path d="M140,192 Q66,158 76,84 Q122,102 140,156 Q158,102 204,84 Q214,158 140,192 Z" fill="#b7e7f7"/>
  <path d="M140,184 Q96,118 140,42 Q184,118 140,184 Z" fill="#eaf9ff"/>
  <circle cx="140" cy="128" r="16" fill="#fff8c9"/>
 </g>
</g>''', seed=23, disp=1.5))

    # 14. Crescent Moon
    items.append(save_svg('crescent', 240, 240, f'''
<g filter="url(#glow)">
 <path d="M142,32 A86,86 0 1,0 202,168 A66,66 0 1,1 142,32 Z" fill="#fae6a2"/>
</g>''', seed=24, disp=1.5))

    # 15. Night Silhouette Tree
    items.append(save_svg('night_tree', 360, 520, f'''
<g filter="url(#s)">
 <path d="M164,510 L174,220 L194,220 L204,510 Z" fill="#1b263b"/>
 <circle cx="184" cy="176" r="108" fill="#1e2f4a"/>
 <circle cx="110" cy="222" r="76" fill="#243858"/>
 <circle cx="258" cy="224" r="78" fill="#192840"/>
 <circle cx="150" cy="146" r="6" fill="#ffe485"/><circle cx="222" cy="186" r="5" fill="#ffe485"/><circle cx="118" cy="230" r="5" fill="#a8e4f7"/>
</g>''', seed=25))

    # 16. Astronomical Clocktower (Ch5)
    items.append(save_svg('clocktower', 560, 680, f'''
<g filter="url(#s)">
 <rect x="132" y="256" width="296" height="412" rx="10" fill="#dfd2b8" stroke="#473c32" stroke-width="6"/>
 <path d="M118,266 Q118,74 280,74 Q442,74 442,266 Z" fill="#2c495c" stroke="#e4b95b" stroke-width="8"/>
 <path d="M168,256 Q280,120 392,256" {GOLD}/>
 <rect x="114" y="252" width="332" height="32" rx="10" fill="#c99a3a"/>
 <circle cx="280" cy="396" r="76" fill="#1c2a44" stroke="#e4b95b" stroke-width="10"/>
 <circle cx="280" cy="396" r="56" {GOLD}/>
 <line x1="280" y1="396" x2="280" y2="348" stroke="#fae6a2" stroke-width="6" stroke-linecap="round"/>
 <line x1="280" y1="396" x2="318" y2="386" stroke="#fae6a2" stroke-width="5" stroke-linecap="round"/>
 <rect x="176" y="514" width="60" height="96" rx="30" fill="#ffe285" stroke="#5c4632" stroke-width="6"/>
 <rect x="324" y="514" width="60" height="96" rx="30" fill="#ffe285" stroke="#5c4632" stroke-width="6"/>
 <circle cx="280" cy="52" r="18" fill="#f0c869" filter="url(#glow)"/>
</g>''', seed=26))

    # 17. Golden Brass Astrolabe (Ch5 Landmark)
    items.append(save_svg('astrolabe', 320, 360, f'''
<g filter="url(#s)">
 <rect x="116" y="294" width="88" height="52" rx="10" fill="#705232"/>
 <rect x="148" y="246" width="24" height="56" fill="#c99a3a"/>
 <g filter="url(#glow)">
  <circle cx="160" cy="148" r="108" fill="none" stroke="#e8bd5e" stroke-width="14"/>
  <circle cx="160" cy="148" r="74" fill="none" stroke="#f7dc84" stroke-width="8" stroke-dasharray="14 8"/>
  <ellipse cx="160" cy="148" rx="104" ry="38" transform="rotate(-28 160 148)" fill="none" stroke="#f0c869" stroke-width="7"/>
  <ellipse cx="160" cy="148" rx="104" ry="38" transform="rotate(28 160 148)" fill="none" stroke="#f0c869" stroke-width="7"/>
  <polygon points="160,108 170,138 200,148 170,158 160,188 150,158 120,148 150,138" fill="#fff7cf"/>
 </g>
</g>''', seed=27, disp=1.5))

    # 18. Starlight Arch
    stars = ''.join(f'<circle cx="{80+i*64}" cy="{56+(i*37)%90}" r="{3+(i%3)*2}" fill="#fff6cc"/>' for i in range(14))
    items.append(save_svg('star_arch', 980, 320, f'''
<g filter="url(#s)">
 <path d="M10,320 Q490,-10 970,320 L970,220 Q490,-90 10,220 Z" fill="#1b2b4c" fill-opacity=".82"/>
 <path d="M40,260 Q490,-10 940,260" {GOLD}/>
 {stars}
</g>''', seed=28, disp=2))

    # 19. Distant Village
    items.append(save_svg('village', 540, 220, f'''
<g filter="url(#s)">
 <rect x="46" y="106" width="88" height="104" fill="#d9cab0"/><polygon points="34,110 90,54 146,110" fill="#7c3b34"/>
 <rect x="76" y="138" width="28" height="32" fill="#ffe18c"/>
 <rect x="176" y="88" width="106" height="122" fill="#e5d7be"/><polygon points="162,92 229,34 296,92" fill="#2e584e"/>
 <rect x="206" y="128" width="24" height="30" fill="#ffe18c"/><rect x="242" y="128" width="24" height="30" fill="#ffe18c"/>
 <rect x="330" y="114" width="84" height="96" fill="#d4c4a8"/><polygon points="318,118 372,66 426,118" fill="#8c5a38"/>
 <rect x="358" y="144" width="28" height="30" fill="#ffe18c"/>
 <rect x="442" y="126" width="66" height="84" fill="#ded0b7"/><polygon points="432,130 475,84 518,130" fill="#7c3b34"/>
 <rect x="464" y="152" width="22" height="24" fill="#ffe18c"/>
</g>''', seed=29))

    # 20. Distant Harbor Hills & Tiny Town
    items.append(save_svg('hills_teal', 1100, 260, f'''
<g filter="url(#s)">
 <path d="M0,260 L0,160 Q140,60 320,130 Q520,40 740,118 Q920,52 1100,132 L1100,260 Z" fill="#244743"/>
 <path d="M0,260 L0,192 Q200,116 420,176 Q660,96 890,162 Q1000,130 1100,170 L1100,260 Z" fill="#2f5b55"/>
 <rect x="770" y="150" width="44" height="52" fill="#dfd2b8"/><polygon points="762,152 792,124 822,152" fill="#8b3a34"/>
 <rect x="784" y="168" width="14" height="16" fill="#ffe285"/>
 <rect x="838" y="162" width="38" height="44" fill="#d6c6a8"/><polygon points="830,164 857,140 884,164" fill="#7a4c32"/>
 <rect x="850" y="176" width="12" height="14" fill="#ffe285"/>
 <path d="M24,205 Q210,134 420,188 Q660,114 890,174" {CREAM}/>
</g>''', seed=30))

    # 21. Harbor Dock Lamp Post
    items.append(save_svg('dock_lamp', 200, 440, f'''
<g filter="url(#s)">
 <rect x="86" y="110" width="18" height="318" rx="6" fill="#3a4542"/>
 <rect x="66" y="404" width="58" height="26" rx="8" fill="#4b5854"/>
 <path d="M95,116 Q95,62 146,62 L146,96" fill="none" stroke="#3a4542" stroke-width="14" stroke-linecap="round"/>
 <path d="M118,96 L174,96 L166,162 L126,162 Z" fill="#ffe48f" filter="url(#glow)" stroke="#3a4542" stroke-width="6"/>
 <path d="M112,98 L146,72 L180,98 Z" fill="#273330"/>
</g>''', seed=31, disp=1.5))

    # 22. Foreground Reeds & Grass
    items.append(save_svg('reeds_fg', 420, 260, f'''
<g filter="url(#s)">
 <path d="M40,260 Q60,140 24,52 Q84,132 76,260 Z" fill="#2c5950"/>
 <path d="M90,260 Q116,112 104,22 Q146,120 128,260 Z" fill="#3a6e63"/>
 <path d="M150,260 Q190,136 218,64 Q200,156 184,260 Z" fill="#274e46"/>
 <path d="M235,260 Q260,144 252,44 Q292,138 276,260 Z" fill="#3a6e63"/>
 <path d="M310,260 Q350,150 388,82 Q366,174 346,260 Z" fill="#2c5950"/>
 <ellipse cx="108" cy="64" rx="11" ry="30" fill="#7a4c32"/>
 <ellipse cx="256" cy="82" rx="11" ry="28" fill="#7a4c32"/>
</g>''', seed=32))

    # 23. Autumn Distant Hills
    items.append(save_svg('hills_autumn', 1100, 260, f'''
<g filter="url(#s)">
 <path d="M0,260 L0,154 Q180,50 380,126 Q600,32 820,118 Q980,68 1100,126 L1100,260 Z" fill="#8b6538"/>
 <path d="M0,260 L0,188 Q230,104 470,168 Q710,92 940,158 Q1030,134 1100,164 L1100,260 Z" fill="#b4833a"/>
 <path d="M24,202 Q240,122 470,180 Q710,110 940,170" {GOLD}/>
</g>''', seed=33))

    # 24. Autumn Golden-Red Bush
    items.append(save_svg('autumn_bush', 380, 220, f'''
<g filter="url(#s)">
 <circle cx="105" cy="148" r="68" fill="#c96b2b"/>
 <circle cx="275" cy="150" r="64" fill="#d9942c"/>
 <circle cx="190" cy="116" r="82" fill="#eab63e"/>
 <rect x="52" y="168" width="276" height="44" rx="20" fill="#b86026"/>
 <path d="M74,174 Q190,62 306,174" {CREAM}/>
</g>''', seed=34))

    # 25. Canyon Twilight Peaks
    items.append(save_svg('canyon_peaks', 1100, 300, f'''
<g filter="url(#s)">
 <polygon points="0,300 130,96 290,224 470,74 670,210 860,64 1020,190 1100,128 1100,300" fill="#3a3352"/>
 <polygon points="0,300 90,154 240,248 410,138 610,242 790,122 960,234 1100,176 1100,300" fill="#2d4949"/>
 <path d="M90,168 L240,256 L410,152 L610,250 L790,136 L960,242" {CREAM}/>
</g>''', seed=35))

    # 26. Soaring Canyon Birds
    items.append(save_svg('birds', 320, 160, f'''
<g filter="url(#s)" fill="#f6ebd3">
 <path d="M40,94 Q76,50 112,86 Q146,48 184,92 Q146,72 112,96 Q76,74 40,94 Z"/>
 <path d="M168,54 Q194,24 220,48 Q246,24 274,52 Q246,40 220,56 Q194,40 168,54 Z"/>
</g>''', seed=36, disp=1.5))

    # 27. Glowing Moonflower Cluster
    items.append(save_svg('flower_cluster', 380, 240, f'''
<g filter="url(#s)">
 <path d="M50,236 Q90,144 46,84 Q112,130 108,236 Z" fill="#264b4f"/>
 <path d="M136,236 Q186,120 220,66 Q216,154 186,236 Z" fill="#315d62"/>
 <path d="M244,236 Q290,146 336,96 Q312,170 286,236 Z" fill="#264b4f"/>
 <g filter="url(#glow)">
  <circle cx="96" cy="118" r="24" fill="#b7e7f7"/><circle cx="96" cy="118" r="9" fill="#fff7c4"/>
  <circle cx="196" cy="88" r="28" fill="#d9f4ff"/><circle cx="196" cy="88" r="10" fill="#fff7c4"/>
  <circle cx="286" cy="130" r="22" fill="#a8dff5"/><circle cx="286" cy="130" r="8" fill="#fff7c4"/>
 </g>
</g>''', seed=37, disp=1.5))

    # 28. Glowing Star Letter
    items.append(save_svg('star_letter', 220, 160, f'''
<g filter="url(#glow)">
 <rect x="26" y="28" width="168" height="106" rx="12" fill="#fff7de" stroke="#e4b95b" stroke-width="6"/>
 <path d="M30,34 L110,88 L190,34" fill="none" stroke="#d9a336" stroke-width="5"/>
 <polygon points="110,56 117,74 136,74 121,85 127,104 110,93 93,104 99,85 84,74 103,74" fill="#f5bd38"/>
</g>''', seed=38, disp=1))

    # 29. Shooting Star
    items.append(save_svg('shooting_star', 420, 180, f'''
<g filter="url(#glow)">
 <path d="M24,132 Q170,118 336,56" fill="none" stroke="#ffe896" stroke-width="14" stroke-linecap="round" opacity=".8"/>
 <path d="M64,140 Q190,122 336,56" fill="none" stroke="#fff9de" stroke-width="6" stroke-linecap="round"/>
 <polygon points="348,22 360,52 392,56 367,76 375,108 348,90 321,108 329,76 304,56 336,52" fill="#fff7c4"/>
</g>''', seed=39, disp=1))

    return items

def rasterize(items):
    with tempfile.TemporaryDirectory() as td:
        for name, w, h, txt in items:
            html_path = os.path.join(td, f'{name}.html')
            png_path = os.path.join(td, f'{name}.png')
            with open(html_path, 'w', encoding='utf-8') as f:
                f.write(f'<!doctype html><html><body style="margin:0;padding:0;background:transparent;overflow:hidden;width:{w}px;height:{h}px">{txt}</body></html>')
            subprocess.run([
                CHROME, '--headless=new', '--no-sandbox', '--disable-gpu',
                '--hide-scrollbars', '--default-background-color=00000000',
                f'--window-size={w},{h}', f'--screenshot={png_path}',
                f'file://{html_path}'
            ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            im = Image.open(png_path).convert('RGBA')
            out = os.path.join(OUT_DIR, f'{name}.webp')
            im.save(out, 'WEBP', quality=90, method=6)
            print(f'Rendered {name}.webp ({im.size[0]}x{im.size[1]}, {os.path.getsize(out)}B)')

if __name__ == '__main__':
    rasterize(build_all())

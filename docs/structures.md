# Treatment structure symbols: what each must show

The test while iterating: cover the label, and an STP engineer should still name the unit.
Each entry lists the parts a symbol must draw, the one or two marks that make it
recognisable, and what to leave out. All are drawn as an open-top **section** (the P&ID
convention in the references: walls, floor, water level, inlet and outlet), flow left to
right, in the library's units (a valve is 16 × 10; a structure is about 48–72 wide).

Shared conventions for every structure:

- Walls and floor at full ink; the water surface at 0.32 ink with the level mark ▽.
  Two levels (TWL and BWL) only where the level moves in operation.
- Internals (media, diffusers, baffles, tubes) at 0.32 ink, so the tank outline reads first.
- Ports on the outline: inlet on the left wall, outlet on the right, sludge or drain at
  the floor, air from above. A port is where a process line attaches.
- Mechanical items that already have a symbol (mixer, pump, blower, weir, decanter) are
  placed from the library, not redrawn inside the tank.

Sources: CPHEEO Manual on Sewerage and Sewage Treatment Systems, Part A (2013), cited
`SEW-2013-A:…`; CPHEEO Manual on Water Supply and Treatment Systems, Part A (2024), cited
`WS-2024-A:…`; Metcalf & Eddy, *Wastewater Engineering*, 4th ed. (2003), cited M&E.

---

## Preliminary treatment

### Receiving chamber
- **Parts:** deep rectangular box; inflow pipe entering low on the left wall; overflow out
  near the top on the right into the screen channels; water level.
- **Recognisable by:** the inlet is lower than the outlet; the floor sits below both.
- **Leave out:** benching detail.

### Screen channel (done: `screen-bar`, `screen-fine` in a channel)
- **Parts:** long shallow channel; inclined bar screen (about 60°) across it; penstock
  (slide gate) at each end; screenings conveyor off the top of a mechanical screen.
- **Recognisable by:** the inclined screen across the flow.
- **Sources:** penstocks and a bypass at each screen, `SEW-2013-A:5.6.1.5`.

### Raw sewage sump (wet well)
- **Parts:** deep well; incoming sewer high on one wall; the floor depressed at one end
  with a flat pad for the submersible pumps; LWL and HWL marks; discharge pipes rising out.
- **Recognisable by:** depressed floor plus submersible pumps sitting on it.
- **Sources:** depression 0.6 m at one end to 1.0 m at the other, `SEW-2013-A:4.2.4`;
  LWL/HWL, `SEW-2013-A:F4.7`.

### Stilling chamber
- **Parts:** small box between the rising main and the screens; inlet entering low,
  outlet as a weir or broad opening high on the right.
- **Recognisable by:** small, deep, inlet below outlet; usually carries the flow
  meter or a level instrument.

### Grit chamber, detritor (square, mechanised)
- **Parts:** shallow square tank; inlet deflector vanes along one side; outlet weir on the
  opposite side; rotating scraper arm on the floor; grit raked to a sump at one corner;
  reciprocating rake or classifier lifting grit out.
- **Recognisable by:** a wide, shallow tank with a floor scraper and a grit classifier
  rising out of one corner.
- **Sources:** `SEW-2013-A:5.6.2`, design example `SEW-2013-A:A5.8`; 100% standby,
  `SEW-2013-A:5.6.2`.

### Grit chamber, vortex type
- **Parts:** cylinder over a conical hopper; tangential inlet; outlet at the rim; central
  drive shaft with a turbine; grit pumped out of the hopper by an airlift pump.
- **Recognisable by:** circle over cone, the tangential inlet, and the vertical shaft.
- **Sources:** `SEW-2013-A:5.6.2.3`; M&E Fig. 5-37 (plan and section).

### Grit chamber, aerated
- **Parts:** deep channel; air diffuser tubes along one side, 0.6–1 m off the floor;
  grit hopper along the floor on that side; outlet weir.
- **Recognisable by:** diffusers on one side only, and the spiral roll (one curved arrow).
- **Sources:** `SEW-2013-A:5.6.2.5`, `SEW-2013-A:F5.29`.

### Equalization tank
- **Parts:** large tank; a submersible mixer or coarse diffusers; transfer pumps at the
  outlet; HWL and LWL, since the level moves.
- **Recognisable by:** two levels and a mixer, with pumps taking flow out.
- **Sources:** `SEW-2013-A:5.6.3`.

## Biological treatment

### SBR basin
- **Parts:** large rectangular tank; inlet from the central channel; fine-bubble diffuser
  grid on the floor; decanter near the outlet wall, drawn at TWL with its lowest position
  at BWL (dashed); decant valve outside the wall; sludge withdrawal pump (SAS) and,
  where used, RAS. Level instrument.
- **Recognisable by:** TWL and BWL with the decanter between them. That is what separates
  an SBR from any aeration tank.
- **Leave out:** the cycle diagram.
- **Sources:** batch fill, aerate, settle, decant in one tank; at least two basins in
  parallel, `SEW-2013-A:5.18.12.1`; decanter types (floating weir, swing arm, float pipe),
  `SEW-2013-A:F5.78`; operating cycle, `SEW-2013-A:F5.79`; M&E Fig. 8-1c.

### MBBR tank
- **Parts:** rectangular tank; suspended carrier media shown as a field of small circles;
  an outlet sieve (media retention screen) at the outlet wall; aerobic: diffusers on the
  floor and a curved arrow for circulation; anoxic: a submerged mixer instead.
- **Recognisable by:** the media dots plus the sieve at the outlet.
- **Sources:** carriers about 10 mm × 7 mm, fill 25–50% of the tank, retained by a perforated
  plate at the outlet, `SEW-2013-A:F5.86` (from M&E), `SEW-2013-A:T5.58`.

### Anoxic tank
- **Parts:** tank; submerged mixer; no diffusers; internal recycle (nitrate return)
  entering.
- **Recognisable by:** a mixer and no air.

### Aeration tank (conventional ASP)
- **Parts:** long tank; diffuser grid; inlet at one end, outlet weir at the other; RAS in.
- **Recognisable by:** diffusers with a single water level and an outlet to a clarifier.

## Settling

### Tube settler
- **Parts:** tank with a hopper bottom (sloped sides to a sludge pipe); a pack of parallel
  tubes inclined at 60° in the upper part; collection launders or a weir above the pack;
  inlet below the pack; sludge out at the hopper.
- **Recognisable by:** the 60° tube pack over a hopper.
- **Sources:** about 60° for counter-current settling and self-draining, detention
  ≤ 10 min, `WS-2024-A:8.6.8`; `WS-2024-A:F8.28`.

### Secondary clarifier (circular)
- **Parts:** circular tank in section with the floor sloping to a central sludge hopper;
  centre feed well (a short open cylinder at the centre, inlet from below); peripheral
  weir and launder at the rim; rotating scraper bridge with a drive at the centre;
  sludge out from the hopper.
- **Recognisable by:** centre feed well plus the floor sloping to a centre hopper.
- **Sources:** `SEW-2013-A:F5.94`, `SEW-2013-A:F5.35`; withdrawal options,
  `SEW-2013-A:5.7.4.2.6.3`.

### Primary clarifier (rectangular)
- **Parts:** long tank; inlet baffle; chain-and-flight scraper; sludge hopper at the inlet
  end; scum skimmer; outlet weir.
- **Recognisable by:** a hopper at the inlet end, not the outlet.

## Disinfection and polishing

### Chlorine contact tank
- **Parts:** shallow tank drawn in **plan** (the baffles only read in plan): serpentine
  baffles making the flow pass back and forth; chlorine dosing at the inlet; outlet over
  a weir.
- **Recognisable by:** the serpentine baffles.
- **Sources:** 30 min detention on the decant flow for SBR plants, `SEW-2013-A:5.18.12.4.1`;
  baffles so the water flows horizontally, `WS-2024-A:9.15`.

### Pressure sand filter (MGF) and activated carbon filter (ACF)
- **Parts:** vertical pressure vessel (capsule ends); a media bed (MGF: hatched graded
  layers; ACF: dotted carbon); inlet top, outlet bottom; a backwash connection.
- **Recognisable by:** a capsule vessel with a media bed; the bed's fill separates MGF
  from ACF.
- **Sources:** IS 3232 `1603` (pressure filter).

### Fiber (disc) filter
- **Parts:** tank with a row of vertical discs on a horizontal shaft; backwash suction
  heads; drive motor.
- **Recognisable by:** the row of discs.
- **Sources:** proposed; common as tertiary filtration ahead of chlorination.

### Ultrafiltration skid
- **Parts:** a rack of vertical membrane modules (tall thin rectangles) on headers; feed,
  permeate and reject ports.
- **Recognisable by:** several identical tall modules in a row with three headers.
- **Sources:** proposed; common in reuse trains (UF feed tank, UF, reject).

## Sludge

### Sludge sump or holding tank
- **Parts:** tank with a mixer or air to keep the sludge in suspension; sludge in from the
  basins; pumps out to dewatering; supernatant return.
- **Recognisable by:** a mixer or air plus a pump to dewatering; no outlet weir.
- **Sources:** air in an intermediate RAS sump, `SEW-2013-A:5.7.4.2.6.3`.

### Gravity thickener
- **Parts:** circular tank with a steep floor cone; picket-fence rake on a central drive;
  overflow weir at the rim; thickened sludge out of the cone.
- **Recognisable by:** steep cone plus the picket rake.
- **Sources:** `SEW-2013-A:6.3`, `SEW-2013-A:6.3.3.1.4`.

### Dewatering centrifuge, filter press, belt press
- Use IS 3232 symbols: centrifuge (Section 17), filter press `1601`. Belt press: two belts
  running over rollers, drawn as one loop pinched by rollers. `SEW-2013-A:6.7.7`.

### Polyelectrolyte dosing tank
- **Parts:** small tank with a top-entry agitator; dosing pump out.
- **Recognisable by:** small tank, agitator on top, dosing pump. Reuse `mixer` and
  `pump-dosing`.
- **Sources:** proposed; the usual polymer make-up for sludge dewatering.

---

## Order to draw them

1. SBR basin, MBBR tank, tube settler: the most common biological units in Indian STPs.
2. Detritor, chlorine contact tank, sludge sump: the rest of a typical SBR plant.
3. Pressure filters, UF skid, fiber filter: a typical reuse polishing train.
4. Clarifiers, thickener, aerated and vortex grit: common elsewhere.

# Guide: How to Model the Costs of War and the Benefits of Peace for the World and for Each Stakeholder

## Purpose

This guide sets out a practical framework for modeling two linked objects:

1. the **economic costs of ongoing war, conflict risk, and escalation involving Iran**, and
2. the **economic benefits of durable peace and broad economic integration involving Iran**.

It is written as a **modeling manual**, not as an advocacy memo. The goal is to help researchers build a system that can produce:

- **global totals**
- **stakeholder-level impacts**
- **channel-by-channel decompositions**
- **short-run and long-run estimates**
- **war-versus-peace comparisons under multiple scenarios**

The guide is designed to be usable by economists, policy analysts, geopolitical risk researchers, and AI-assisted research systems.

---

## 1. Core modeling principle

The most important principle is:

> **Model war and peace as alternative states of the same system, using the same accounting rules.**

Do **not** build one model for war and a separate unrelated model for peace.  
Instead, define a common baseline and then simulate different states of the world:

- fragmented baseline
- ongoing war
- worsening escalation
- ceasefire without normalization
- partial normalization
- durable peace with partial integration
- durable peace with full integration

This matters because the comparison you actually want is not an isolated peace dividend or an isolated war-cost estimate. It is:

\[
\Delta_i(s_1,s_0) = W_i(s_1) - W_i(s_0)
\]

where:

- \(i\) is a stakeholder
- \(s_0\) is one state of the world
- \(s_1\) is another state of the world
- \(W_i(\cdot)\) is stakeholder welfare, output, or GDP-equivalent value

The same structure can be used to compare:

- peace vs. current war
- peace vs. fragmented non-war baseline
- worsening war vs. current war
- normalization vs. sanctions-only relief

---

## 2. What should be modeled?

A serious framework should model **both**:

### A. The cost of war
This includes:

- direct physical destruction
- deaths, injuries, and labor-force disruption
- lost output
- sanctions and trade restrictions
- shipping and insurance costs
- energy price shocks
- financial risk premia
- aviation and tourism disruption
- humanitarian and refugee costs
- crisis-response and conflict-related security burdens
- lower investment due to uncertainty

### B. The benefit of peace
This includes:

- reduced conflict risk
- lower trade barriers and sanctions frictions
- lower shipping and insurance costs
- lower energy risk premia
- higher trade and services flows
- restored banking and payments access
- higher FDI and portfolio investment
- tourism and aviation normalization
- technology access and productivity spillovers
- lower precautionary spending and lower disruption risk

---

## 3. The stakeholder structure

A practical first-pass stakeholder list is:

### Core principals
1. Iran  
2. United States  
3. Israel  

### Gulf states
4. Saudi Arabia  
5. United Arab Emirates  
6. Qatar  
7. Oman  
8. Kuwait  
9. Bahrain  

### Regional spillover and broker states
10. Egypt  
11. Turkey  
12. Pakistan  
13. Iraq  
14. Jordan  
15. Lebanon  
16. Yemen  
17. Syria  

### Major external powers and blocs
18. Europe  
19. Russia  
20. China  
21. India  
22. Japan + South Korea  

### Residual global buckets
23. Rest of Global North  
24. Global South energy importers  
25. Global South energy exporters  

This list is not final truth. It is a **practical reporting structure**.  
The best long-run implementation is to calculate impacts at the **country level** wherever possible and then aggregate into stakeholder blocks for reporting.

---

## 4. The accounting framework

Every estimate should be decomposed into **three ledgers**.

### Ledger 1: Real resource losses or gains
These change the world’s real wealth.

Examples:
- destroyed buildings, ports, pipelines, and power systems
- lost production from plant shutdowns
- wasted fuel and longer shipping distances
- inventory spoilage
- lost workdays
- lower productivity
- reconstruction needs

### Ledger 2: Transfers and redistribution
These shift income across stakeholders but do **not** necessarily change total world output one-for-one.

Examples:
- lower oil prices helping importers and hurting exporters
- sanctions rents disappearing
- changes in bargaining power
- windfall profits for alternate suppliers
- insurance payouts

### Ledger 3: Risk, uncertainty, and option value
These change welfare through confidence, volatility, and capital allocation.

Examples:
- lower war-risk insurance premia
- lower sovereign spreads
- lower firm discount rates
- higher willingness to invest
- lower probability of catastrophic chokepoint disruption

This distinction is essential.  
If you do not separate these ledgers, you will almost certainly double count.

---

## 5. The output metrics

The framework should produce outputs at several levels.

### Global outputs
- annual global GDP-equivalent loss from war
- annual global GDP-equivalent gain from peace
- cumulative 5-year and 10-year effects
- channel decomposition
- resource loss vs transfer decomposition

### Stakeholder outputs
For each stakeholder:
- annual net effect under each scenario
- cumulative effect
- decomposition by channel
- share of global gains or costs
- range under conservative / base / upside assumptions

### Optional finance outputs
- change in sovereign spreads
- change in equity valuations
- change in volatility
- change in FX pressure
- change in expected cost of capital

### Optional welfare outputs
- GDP-equivalent welfare change
- household consumption equivalent
- poverty or food-security exposure
- inflation pass-through

---

## 6. The scenario ladder

The model should define explicit scenarios.

### S0. Fragmented baseline
No full peace, but no major current escalation beyond an embedded risk premium.

### S1. Ongoing war / current conflict state
Observed war conditions, sanctions, airspace disruption, elevated insurance, elevated energy risk, and military operations.

### S2. Escalation
Broader regional conflict, more severe shipping disruption, tighter sanctions, higher defense posture, deeper financial fragmentation.

### S3. Ceasefire without normalization
Fighting declines, but trust remains low. Many restrictions remain.

### S4. Partial normalization
Some sanctions relief and trade reopening, but high residual mistrust and security costs.

### S5. Durable peace with partial integration
Conflict risk falls materially, some economic channels normalize, deterrence remains significant.

### S6. Durable peace with full integration
Broad normalization across trade, finance, logistics, aviation, investment, and regional projects.

Every channel should be estimated under the same scenario set where possible.

---

## 7. The master equation

At the stakeholder level, the cleanest high-level equation is:

\[
W_i(s) =
Y_i(s)
- D_i(s)
- H_i(s)
- C_i^{sec}(s)
+ T_i(s)
+ R_i(s)
\]

Where:

- \(Y_i(s)\) = output and income generated under scenario \(s\)
- \(D_i(s)\) = direct destruction and disruption costs
- \(H_i(s)\) = humanitarian and displacement burden
- \(C_i^{sec}(s)\) = conflict-related security burden
- \(T_i(s)\) = net transfer effects (for example commodity price transfers)
- \(R_i(s)\) = risk and confidence effects

For practical implementation, this should be broken into modules:

\[
W_i(s) = B_i
+ \Delta Trade_i
+ \Delta Energy_i
+ \Delta Shipping_i
+ \Delta Finance_i
+ \Delta Tourism_i
+ \Delta Security_i
+ \Delta Humanitarian_i
+ \Delta Productivity_i
\]

where \(B_i\) is a baseline level and each \(\Delta\) term is scenario-specific.

---

## 8. The modeling modules

## Module A. Direct war damage and disruption

This module captures the costs borne most heavily by directly affected states.

### What to include
- destruction of housing, factories, roads, ports, airports, pipelines, telecom, and electricity systems
- business interruption
- shutdowns of schools and hospitals
- labor-force losses from death, injury, mobilization, and displacement
- emergency fiscal outlays
- reconstruction requirements

### Core formulas

#### Capital destruction
\[
C_{i}^{capital} = \sum_{a \in A_i} p_a \times RC_a \times \delta_a
\]

Where:
- \(a\) is an asset class
- \(RC_a\) is replacement cost
- \(\delta_a\) is damage fraction
- \(p_a\) is probability or share damaged

#### Output interruption
\[
C_i^{output} = \sum_{t=1}^{T} \left(Y_{i,t}^{baseline} - Y_{i,t}^{observed/simulated}\right)
\]

#### Labor loss
\[
C_i^{labor} = \sum_{g} N_{ig}^{lost} \times VA_{ig}
\]

Where:
- \(N_{ig}^{lost}\) is labor input lost for group \(g\)
- \(VA_{ig}\) is value added per worker or worker-year

### Data sources
- satellite damage assessment
- infrastructure inventories
- budget documents
- firm shutdown data
- electricity generation and traffic proxies
- port throughput
- night lights
- payroll or labor-market indicators

### Best use
This is crucial for:
- Iran
- Israel
- Lebanon
- Yemen
- Syria
- Iraq
- Jordan in spillover form

---

## Module B. Trade and sanctions

This module captures how war, sanctions, and peace affect goods and services trade.

### Why this matters
Trade is one of the largest channels through which both war and peace propagate.  
A proven way to model this is with **structural gravity** and general equilibrium.[^wto-thoenig] The World Bank’s Iran sanctions paper is a useful template for how sanctions relief and strategic responses can be embedded in a quantitative trade framework.[^wb-iran]

### Core idea
Trade flows depend on:
- partner GDP and demand
- trade costs
- sanctions
- border frictions
- shipping time and reliability
- payments and banking access
- perceived risk

### Simple gravity equation
\[
X_{ij} = G \cdot \frac{Y_i E_j}{Y_W} \cdot \tau_{ij}^{-\theta}
\]

Where:
- \(X_{ij}\) = exports from \(i\) to \(j\)
- \(Y_i\) = production capacity of \(i\)
- \(E_j\) = expenditure of \(j\)
- \(\tau_{ij}\) = bilateral trade cost
- \(\theta\) = trade elasticity

### War scenario implementation
Increase \(\tau_{ij}\) through:
- sanctions
- export controls
- banking/payment frictions
- port and airspace disruption
- inspection delays
- higher insurance and security costs

### Peace scenario implementation
Reduce \(\tau_{ij}\) by:
- sanctions relief
- restoration of shipping and aviation
- banking normalization
- restoration of commercial confidence
- reduction in disruption probability

### Outputs
- bilateral trade creation
- trade diversion
- sectoral value-added effects
- consumer-price effects
- welfare effects

### Best use
All stakeholders, especially:
- Iran
- United States
- Europe
- China
- India
- Gulf states
- Turkey
- Japan + South Korea

---

## Module C. Energy markets

This module captures the oil, gas, and fuel effects of war and peace.

### Why this matters
War involving Iran changes:
- the probability of disruption in the Strait of Hormuz
- oil and LNG prices
- refining margins
- importer bills
- exporter revenues
- inflation

EIA reports that in 2024 the Strait of Hormuz carried about **20 million barrels/day**, equivalent to about **20% of global petroleum liquids consumption**, and about **20% of global LNG trade** also transited Hormuz.[^eia-hormuz-oil] [^eia-hormuz-lng]

### Important accounting rule
A higher oil price is **not automatically a global resource loss**.  
Part of it is a **transfer** from importers to exporters.

So you should estimate at least three separate quantities:

1. **Importer burden**
2. **Exporter revenue effect**
3. **Net world efficiency loss**

### Formulas

#### Importer oil bill effect
\[
C_{i}^{oil} = \Delta P^{oil} \times M_{i}^{net\ imports}
\]

#### Exporter revenue effect
\[
G_{i}^{oil} = \Delta P^{oil} \times X_{i}^{net\ exports}
\]

#### Net world efficiency loss
This is not just price times volume. It must include:
- reduced demand
- substitution cost
- idle capacity
- misallocation
- inflation and policy tightening effects

A practical implementation is:
- estimate price changes with an event study or scenario model
- feed those into a CGE or multi-region input-output model

### Peace modeling
Peace reduces:
- oil risk premium
- LNG risk premium
- expected chokepoint disruption
- precautionary inventories
- emergency hedging

### Stakeholders most affected
- Saudi Arabia
- UAE
- Qatar
- Kuwait
- Bahrain
- Iran
- Europe
- China
- India
- Japan + South Korea
- Global South energy importers
- Global South energy exporters
- Russia

---

## Module C2. Iran wartime monetization, Strait tolling, and strategic leverage

This module captures **Iran-positive economic and bargaining effects that may arise during war**, even while the world as a whole becomes poorer.

### Why this module is needed
A war-cost model will be incomplete if it only counts Iran's losses and omits the ways conflict may temporarily improve Iran's revenue position or bargaining leverage. In the current conflict, Reuters has reported a temporary U.S. waiver for some Iranian oil already at sea, a public Iranian position that "non-hostile" ships may transit Hormuz if they coordinate with Iranian authorities, and regional discussion of possible Suez-style tolls.[^reuters-waiver] [^reuters-hormuz-transit] [^reuters-hormuz-talks] Relevant channels therefore include:

- temporary monetization of oil made saleable by short-lived waivers or relaxed enforcement
- higher realized prices on eligible exports during supply squeezes
- possible transit-fee or controlled-passage revenue linked to Hormuz
- bargaining leverage from demonstrating an ability to impede a critical chokepoint
- selective access rents from deciding which ships can pass

These effects should **not** be treated as straightforward additions to world welfare. Most are:
- **transfers** from other stakeholders to Iran,
- **temporary rents** created by scarcity and coercive capacity, or
- **option value** tied to future negotiations.

### Critical accounting rule
For the **world**, this module is mostly **not a gain**.  
For **Iran**, it may be a gain.  
For the **rest of the world**, it is usually a cost, a transfer, or both.

So the global accounting treatment should be:

- count realized extra oil revenue to Iran as a **stakeholder gain**
- do **not** count that same revenue as a net new global gain unless a separate real-efficiency channel justifies it
- count tolls and transit fees as **redistribution**
- treat strategic leverage as **option value**, not ordinary GDP
- net out long-run backlash, bypass investment, and containment costs

### Submodule C2A. Temporary oil monetization gains

This submodule estimates the wartime benefit Iran may receive from oil that becomes temporarily marketable because of waivers, relaxed enforcement, gray-market channels, or emergency toleration by buyers.

#### Formula
\[
G_{Iran,t}^{oil\_monetization}
=
B_t^{eligible}
\times
P_t^{realized}
\times
\alpha_t^{netback}
\times
\pi_t^{collection}
\]

Where:
- \(B_t^{eligible}\) = barrels eligible for sale in period \(t\)
- \(P_t^{realized}\) = realized sale price
- \(\alpha_t^{netback}\) = share of price actually retained after discounts, freight, and intermediation
- \(\pi_t^{collection}\) = probability that payment is successfully collected and retained

#### Notes
This should be scenario-based and time-limited.[^reuters-waiver]  
It is especially important when:
- sanctions are relaxed temporarily
- oil already at sea becomes dischargeable
- buyers are willing to pay above-normal premiums under shortage conditions

### Submodule C2B. Strait-of-Hormuz tolling or controlled-passage revenue

This submodule estimates revenue Iran might earn if it charges transit fees, escort fees, inspection/compliance fees, or other controlled-passage charges.

#### Formula
\[
G_{Iran,t}^{transit}
=
N_t^{approved\ transits}
\times
Fee_t^{average}
+
Escort_t
+
Compliance_t
-
Admin_t
\]

Where:
- \(N_t^{approved\ transits}\) = number of vessels allowed to transit
- \(Fee_t^{average}\) = average per-vessel or per-cargo fee
- \(Escort_t\) = escort/security service revenue if applicable
- \(Compliance_t\) = inspection or clearance-related fees
- \(Admin_t\) = operating and enforcement cost

#### Accounting rule
This is almost entirely a **transfer**, not a net addition to world output.[^reuters-hormuz-transit] [^reuters-hormuz-talks]

### Submodule C2C. Selective-access rents

If Iran permits some vessels and excludes others, it may create:
- preferential access value for friendly states
- bargaining power over routing
- rents for compliance, coordination, or diplomacy

These can be approximated as:

\[
G_{Iran,t}^{selective\ access}
=
\sum_v q_{v,t} \times Value_{v,t}^{privileged\ passage}
\]

This is difficult to observe directly, so it is best modeled as a scenario parameter.

### Submodule C2D. Strategic leverage and option value

Showing that Hormuz can be disrupted may increase Iran's leverage in future negotiations over:
- sanctions
- security guarantees
- maritime arrangements
- military de-escalation
- regional recognition or diplomatic concessions

This should be treated as **option value**, not as conventional output.

#### Formula
\[
V_{Iran}^{strategic\ option}
=
Pr(\text{leverage changes deal})
\times
Value(\text{better future deal terms})
\]

Examples of better deal terms might include:
- stronger sanctions relief
- longer implementation windows
- better shipping terms
- lower enforcement intensity
- higher tolerance for exports or payments

### Submodule C2E. Long-run backlash and bypass costs

Demonstrating coercive capacity can also create long-run costs for Iran by encouraging:
- bypass pipelines and route diversification
- strategic stockpiling by importers
- stronger naval coordination against Iran
- broader political containment
- lower willingness to treat Hormuz-adjacent routes as safe
- reduced investment because of perceived structural insecurity

So net leverage should be written as:

\[
NetV_{Iran}^{leverage}
=
V_{Iran}^{strategic\ option}
-
C_{Iran}^{backlash}
\]

### Practical implementation rule
For each scenario, estimate:

1. **Temporary oil monetization gain**
2. **Transit / toll revenue**
3. **Selective-access rents**
4. **Strategic option value**
5. **Backlash / bypass cost**
6. **Net wartime upside to Iran**

Then classify each item as:
- real resource gain
- transfer
- option value
- long-run offset

### Relationship to peace modeling
This module is also needed for the **peace side**, because peace may remove some of Iran's wartime rents.

That means peace benefits for Iran should be written as:

\[
B_{Iran}^{peace}
=
G_{Iran}^{trade}
+
G_{Iran}^{finance}
+
G_{Iran}^{FDI}
+
G_{Iran}^{productivity}
+
G_{Iran}^{aviation/tourism}
+
G_{Iran}^{security\ relief}
-
L_{Iran}^{lost\ wartime\ rents}
\]

where \(L_{Iran}^{lost\ wartime\ rents}\) includes:
- lower scarcity rents on oil
- disappearance of tolling or selective-passage revenue
- lower coercive leverage value
- loss of gray-market premia

This prevents the peace model from overstating Iran's net gain by pretending wartime leverage has no value.

### Global accounting treatment
When reporting world totals:

- do **not** add Iran's oil windfall to global gains unless the model separately identifies a true efficiency gain
- do **not** count transit fees as net world output
- report strategic leverage separately from GDP-equivalent output
- count backlash and bypass investment as real costs where appropriate

### Best use
This module is especially important for:
- Iran
- Saudi Arabia
- UAE
- Oman
- Qatar
- India
- China
- Europe
- global energy importers
- global shipping stakeholders

---

## Module D. Shipping, insurance, and chokepoints

This module is central because war and peace affect not only energy but also the cost and reliability of moving everything else.

### Why this matters
UNCTAD’s maritime work shows that disruptions in chokepoints increase voyage lengths, fuel use, delays, and freight rates, and those effects pass through into prices and GDP.[^unctad-rmt] The same logic applies to the Persian Gulf, the Strait of Hormuz, and indirectly the Red Sea / Bab el-Mandeb system.

### What to include
- tanker rates
- container freight
- dry bulk freight
- war-risk insurance
- hull insurance
- rerouting cost
- congestion and delay
- port inefficiency
- inventory carrying cost
- security escort or patrol-related cost

### Voyage-level equation
\[
C^{voyage} = C_{fuel} + C_{charter} + C_{crew} + C_{insurance} + C_{delay} + C_{security}
\]

Then:
\[
\Delta C^{voyage} = \Delta C_{fuel} + \Delta C_{insurance} + \Delta C_{delay} + \Delta C_{security} + \dots
\]

### Stakeholder-level equation
\[
C_i^{shipping} = \sum_{r,k} V_{irk} \times \Delta c_{rk}
\]

Where:
- \(r\) is route
- \(k\) is cargo class
- \(V_{irk}\) is stakeholder exposure on route \(r\)
- \(\Delta c_{rk}\) is route-specific shipping cost shock

### Peace modeling
Peace reduces:
- route risk
- war-risk insurance
- expected delay
- rerouting probability
- fuel burn from diversion
- inventory buffers

### Stakeholders most affected
- UAE
- Oman
- Egypt
- Saudi Arabia
- Qatar
- Bahrain
- Kuwait
- Europe
- China
- India
- Japan + South Korea
- Global South importers

---

## Module E. Finance, banking, and sovereign risk

This module captures the cost of geopolitical risk in financial markets.

### Why this matters
IMF work finds that geopolitical risk events can lower asset prices, raise sovereign risk premiums, and threaten macro-financial stability.[^imf-gpr]

### What to include
- sovereign spreads
- bank funding costs
- cross-border lending
- equity valuations
- exchange rates
- capital flows
- payment-system access
- sanctions-related compliance friction
- cost of insuring trade and investment

### Event-study implementation
For each major conflict event:
- estimate changes in CDS, spreads, equities, and FX
- infer immediate risk repricing
- map that into borrowing costs and investment responses

### Capital-cost equation
\[
\Delta I_i \approx \eta_i \times \Delta r_i
\]

Where:
- \(I_i\) is investment
- \(r_i\) is cost of capital
- \(\eta_i\) is the elasticity of investment with respect to financing cost

### Peace modeling
Peace reduces:
- sanctions risk
- reimposition risk
- confiscation risk
- financing spreads
- payment-system frictions
- uncertainty discount

### Key stakeholders
- Iran
- Europe
- China
- UAE
- Turkey
- Pakistan
- Egypt
- global investors
- energy importers with fragile external balances

---

## Module F. Aviation, tourism, and business travel

This channel is often under-modeled.

### What to include
- airspace closure cost
- rerouting
- passenger demand collapse
- tourism losses
- pilgrimage and religious travel effects
- business travel restoration
- cargo aviation disruption
- airport throughput changes

### Formula
\[
C_i^{aviation/tourism} = \Delta Pax_i \times Spend_i + \Delta Cargo_i \times Margin_i + \Delta Routing_i \times Cost_i
\]

### Peace modeling
Peace restores:
- normal flight paths
- business conferences and commercial visits
- tourism flows
- investor site visits
- pilgrimage and family travel
- air cargo efficiency

### Key stakeholders
- UAE
- Qatar
- Saudi Arabia
- Oman
- Egypt
- Turkey
- Jordan
- Europe
- Iran

---

## Module G. Humanitarian, migration, and refugee spillovers

This module matters especially for neighboring states and fragile economies.

### What to include
- refugee reception costs
- health and education burden
- shelter and food support
- labor-market displacement
- aid flows
- social-service strain
- remittance disruptions

### Equation
\[
C_i^{humanitarian} = N_i^{displaced} \times c_i^{support} + C_i^{service\ strain} + C_i^{labor\ adjustment}
\]

### Peace modeling
Peace reduces:
- new displacement
- emergency aid need
- cross-border strain
- social-service overload

### Key stakeholders
- Iraq
- Jordan
- Lebanon
- Syria
- Turkey
- Pakistan
- Yemen
- Europe

---

## Module H. Defense and security economics

This module must be handled carefully.

### Critical warning
Peace does **not** imply that defense spending goes to zero.

The right concept is:

> **Peace reduces the conflict-specific security premium, but stakeholders retain a deterrence floor.**

Global military spending reached **$2.718 trillion in 2024**, equal to **2.5% of world GDP**, according to SIPRI.[^sipri-2024] That underscores how unrealistic it would be to treat peace as total demilitarization.

### Recommended decomposition
Break security spending into:

1. **Structural deterrence floor**  
   Spending that remains under peace.

2. **Conflict-specific premium**  
   Spending driven by active war, proxy threats, emergency posture, escorts, surge readiness, missile defense alerts, and crisis operations.

3. **Reallocated spending**  
   Spending that does not disappear but is redirected.

### Formula
\[
Savings_i^{security} =
Spend_i^{Iran\text{-}linked}
\times Share_i^{reducible}
\times Impl_i
\]

Then:

\[
NetSavings_i^{security} =
Savings_i^{security}
- Reinvestment_i
\]

Where:
- \(Spend_i^{Iran\text{-}linked}\) = Iran-related security burden
- \(Share_i^{reducible}\) = fraction removable under peace
- \(Impl_i\) = implementation factor or trust realization factor
- \(Reinvestment_i\) = redirected but not eliminated spending

### Key stakeholders
- United States
- Israel
- Saudi Arabia
- UAE
- Bahrain
- Kuwait
- Qatar
- Oman
- Iran

---

## Module I. Productivity, confidence, and long-run integration gains

This is the most uncertain module, but it is essential for peace modeling.

### What to include
- restored access to imported technology
- management know-how
- more efficient intermediate input sourcing
- less precautionary inventory
- lower uncertainty
- higher entrepreneurship
- better regional project coordination
- deeper services and financial integration

### Modeling approaches
- reduced-form estimates from normalization episodes
- productivity wedges in CGE models
- scenario-based investment accumulation
- sector-specific expert assumptions

### Caution
This module should be heavily stress-tested and discounted relative to near-term measurable channels.

---

## 9. The model stack

A serious system should not rely on one method only.  
Use a **hybrid model stack**.

### Layer 1. Event studies
Use high-frequency market data to infer immediate repricing from conflict or de-escalation events.

Best for:
- oil and gas
- shipping rates
- insurance
- equities
- sovereign spreads
- FX

### Layer 2. Structural gravity
Use for:
- trade creation and trade destruction
- sanctions
- services reopening
- bilateral exposure

This is the cleanest empirical workhorse for trade-policy and conflict-risk modeling.[^wto-thoenig]

### Layer 3. Multi-region input-output (MRIO) or CGE
Use for:
- economy-wide propagation
- sector spillovers
- price pass-through
- importer/exporter interactions
- GDP and welfare changes

The World Bank’s sanctions-relief study for Iran is a useful benchmark for this kind of world-economy accounting.[^wb-iran]

### Layer 4. Satellite and conflict-damage accounting
Use for:
- direct destruction
- infrastructure damage
- reconstruction burden

### Layer 5. Scenario engine
Use to integrate expert assumptions where data are thin:
- speed of normalization
- political durability
- sanctions rollback timing
- deterrence floor
- project realization rates

---

## 10. How to calculate the cost of war

The cost of war for stakeholder \(i\) in scenario \(s\) can be written as:

\[
C_i^{war}(s) =
C_i^{direct}
+ C_i^{trade}
+ C_i^{energy}
+ C_i^{shipping}
+ C_i^{finance}
+ C_i^{aviation}
+ C_i^{humanitarian}
+ C_i^{security}
+ C_i^{productivity}
- G_i^{offsets}
\]

Where \(G_i^{offsets}\) includes offsetting gains such as:
- commodity windfalls
- trade diversion gains
- alternate-supplier gains
- geopolitical rents
- temporary sanctions-relief oil revenue
- transit-fee or controlled-passage income
- strategic leverage or option value where separately scored

Then the global cost is:

\[
C_{world}^{war}(s) =
\sum_i C_i^{war}(s)
- \sum_i Transfers_i^{internal}
\]

That last subtraction matters because transfers between stakeholders should not be counted as net world losses.

### Practical war-output table
For each stakeholder:
- direct physical damage
- lost output
- energy bill shock
- shipping and insurance burden
- sanctions/trade losses
- financial risk burden
- aviation/tourism burden
- humanitarian burden
- security burden
- offsetting windfalls
- wartime monetization or leverage gains where relevant
- net annual impact

---

## 11. How to calculate the benefit of peace

The benefit of peace for stakeholder \(i\) relative to war scenario \(w\) is:

\[
B_i^{peace} = W_i(peace) - W_i(war)
\]

Or module by module:

\[
B_i^{peace} =
B_i^{trade}
+ B_i^{energy}
+ B_i^{shipping}
+ B_i^{finance}
+ B_i^{aviation}
+ B_i^{security}
+ B_i^{humanitarian}
+ B_i^{productivity}
- L_i^{adverse\ transfers}
\]

Where \(L_i^{adverse\ transfers}\) captures losses from peace that some stakeholders may incur, such as:
- lower hydrocarbon rents
- lower crisis-related market power
- lower alternate-route windfalls
- lower sanction-evasion rents
- loss of temporary sanctions-relief rents
- loss of transit-fee or selective-passage income
- lower strategic leverage value derived from chokepoint disruption

### Practical peace-output table
For each stakeholder:
- trade normalization gain
- energy-risk-premium reduction effect
- shipping and insurance normalization gain
- finance and banking normalization gain
- aviation and tourism gain
- conflict-specific security saving
- humanitarian relief
- productivity / technology / FDI gain
- offsetting losses
- net annual impact

---

## 12. How to avoid double counting

This is where many models fail.

### Do not add all of the following blindly:
- higher oil import bill
- higher CPI
- lower real income
- lower GDP
- lower welfare

These often reflect the **same shock at different stages**.

### Recommended discipline
For every module, label each quantity as one of:
- direct resource loss
- transfer
- risk/welfare channel
- reporting indicator only

For example:

| Item | Count in global total? | Count in stakeholder total? | Notes |
|---|---:|---:|---|
| Destroyed infrastructure | Yes | Yes | Real resource loss |
| Higher oil import bill | No, not by itself | Yes | Transfer from importers to exporters unless net inefficiency modeled separately |
| Higher exporter oil revenue | No, not by itself | Yes | Transfer |
| Freight rerouting fuel burn | Yes | Yes | Real resource use |
| Higher CPI | No, usually not separately | Optional | Often a pass-through indicator |
| Sovereign spread increase | Yes via output/investment channel | Yes | Avoid counting both spread and full resulting GDP effect twice |

### Rule of thumb
Global totals should emphasize:
- real resource changes
- welfare changes
- explicitly modeled risk effects

Stakeholder tables can show transfers, but they should be labeled clearly.

---

## 13. How to estimate each stakeholder

Each stakeholder needs an exposure map.

## Iran
Main channels:
- direct war damage
- sanctions and trade reopening
- banking/payment access
- oil export access
- temporary sanctions-relief or gray-market oil monetization
- possible Strait of Hormuz transit or controlled-passage revenue
- strategic leverage and bargaining option value
- backlash and bypass risk from demonstrating coercive capability
- FDI
- aviation/tourism
- productivity and technology access
- humanitarian burden
- domestic stabilization

## United States
Main channels:
- military and security burden
- energy-price effects
- financial market effects
- alliance-management cost
- sanctions enforcement cost
- shipping and insurance exposure
- selective trade/investment upside from normalization

## Israel
Main channels:
- direct war disruption
- mobilization and defense burden
- tourism and aviation
- sovereign risk
- peace dividend from lower conflict exposure
- technology and trade links under normalization

## Saudi Arabia
Main channels:
- oil revenue transfer effects
- security burden
- regional investment upside
- logistics and air traffic
- lower Gulf risk
- possible infrastructure and project gains under peace

## United Arab Emirates
Main channels:
- shipping and ports
- aviation
- finance and trade intermediation
- insurance and business confidence
- tourism and business travel
- regional project upside

## Qatar
Main channels:
- LNG price and risk premium
- diplomacy role
- aviation
- investment
- regional stability

## Oman
Main channels:
- Hormuz adjacency
- mediation value
- shipping and logistics
- trade facilitation
- tourism and business confidence

## Kuwait / Bahrain
Main channels:
- energy
- finance
- security burden
- proximity exposure

## Egypt
Main channels:
- mediation role
- Suez-linked shipping interactions
- tourism
- energy import burden
- regional confidence

## Turkey
Main channels:
- trade corridor role
- diplomacy
- financial sensitivity
- refugee spillovers
- energy
- reconstruction and regional business upside

## Pakistan
Main channels:
- diplomacy
- energy imports
- shipping and macro vulnerability
- remittances and regional political risk

## Iraq
Main channels:
- direct spillover risk
- trade links
- migration and security burden
- energy exposure
- reconstruction or corridor upside under peace

## Jordan
Main channels:
- refugee and humanitarian burden
- trade corridors
- tourism
- logistics

## Lebanon
Main channels:
- direct conflict damage
- humanitarian burden
- sovereign and banking stress
- reconstruction need
- peace dividend from de-escalation

## Yemen
Main channels:
- direct conflict exposure
- Red Sea/Bab el-Mandeb interaction
- humanitarian burden
- shipping externalities

## Syria
Main channels:
- spillover conflict environment
- sanctions and logistics
- reconstruction and refugee links

## Europe
Main channels:
- energy prices
- shipping and insurance
- sanctions policy
- trade normalization
- migration
- financial exposure

## Russia
Main channels:
- oil/gas price transfer effects
- geopolitical leverage effects
- trade diversion
- sanctions-alignment effects
- arms or energy market shifts

## China
Main channels:
- energy importer benefits from peace
- manufacturing and shipping exposure
- investment and infrastructure opportunities
- financial and geopolitical positioning

## India
Main channels:
- energy import burden
- trade connectivity
- shipping
- pharmaceuticals and industrial supply chains
- investment upside

## Japan + South Korea
Main channels:
- energy imports
- shipping security
- manufacturing supply chains
- insurance and financial markets

## Rest of Global North
Main channels:
- financial spillovers
- energy prices
- trade and inflation
- risk premia

## Global South energy importers
Main channels:
- fuel and fertilizer import burden
- shipping pass-through
- inflation and balance-of-payments pressure
- food security

## Global South energy exporters
Main channels:
- commodity price transfers
- shipping exposure
- investment and geopolitical alignment effects

---

## 14. Calibration strategy

A good model should combine **hard data** and **structured assumptions**.

### Use hard data for:
- trade shares
- oil and gas import dependence
- military spending
- shipping route exposure
- sovereign spreads
- tourism receipts
- FDI
- refugee stocks
- direct damage

### Use structured assumptions for:
- sanctions rollback speed
- trust-building pace
- deterrence floor
- probability of re-escalation
- how quickly capital returns
- long-run productivity effects

### Scenario bands
For each major uncertain parameter, define:
- conservative
- base
- upside

Do not present a single point estimate without ranges.

---

## 15. Validation and plausibility checks

A model of this kind should be validated in multiple ways.

### Internal checks
- no sign errors
- no double counting
- consistent units
- stakeholder totals add up correctly

### Historical analog checks
Compare the model with:
- sanctions relief episodes
- major energy shock episodes
- maritime disruption episodes
- post-conflict normalization cases

### Literature checks
Benchmark against:
- structural gravity conflict-risk work[^wto-thoenig]
- sanctions-relief estimates for Iran[^wb-iran]
- war-spillover studies such as Ukraine[^wb-ukraine]
- maritime chokepoint pass-through estimates[^unctad-rmt]
- geopolitical risk and financial repricing studies[^imf-gpr]
- defense-spending and peace-dividend literature[^imf-peacedividend]

### Political realism checks
Ask whether the pace of:
- sanctions relief
- defense adjustment
- FDI return
- tourism normalization
- banking reintegration

is politically plausible.

---

## 16. Minimum viable model vs research-grade model

## Minimum viable model
A usable first version can include:

1. trade and sanctions module  
2. energy module  
3. shipping and insurance module  
4. finance/risk module  
5. security-burden module  
6. stakeholder allocation table  

This version is enough to produce:
- annual war cost
- annual peace dividend
- stakeholder distribution

## Research-grade model
A stronger version adds:
- MRIO or CGE propagation
- country-level exposure matrices
- dynamic 5–10 year paths
- reconstruction module
- humanitarian module
- FDI and productivity dynamics
- explicit re-escalation probabilities

---

## 17. Recommended implementation workflow

### Step 1. Define scenarios
Write exact rules for S0–S6.

### Step 2. Build stakeholder exposure sheets
For each stakeholder, define:
- energy exposure
- trade exposure
- shipping exposure
- defense exposure
- financial exposure
- humanitarian exposure

### Step 3. Estimate immediate market shocks
Use event studies or scenario assumptions for:
- oil
- LNG
- freight
- insurance
- sovereign spreads
- FX

### Step 4. Feed shocks into trade and MRIO/CGE layers
Estimate output and welfare pass-through.

### Step 5. Add direct war-damage modules
Especially for directly affected states.

### Step 6. Add defense/security and humanitarian modules
Include deterrence floor and implementation timing.

### Step 7. Produce stakeholder tables
War cost, peace gain, channel decomposition.

### Step 8. Run robustness tests
Vary:
- oil price response
- shipping disruption severity
- sanctions rollback speed
- deterrence floor
- FDI realization rate

---

## 18. Suggested final reporting tables

## Table A. Global comparison
- war cost, annual
- war cost, 5-year cumulative
- peace benefit, annual
- peace benefit, 5-year cumulative
- peace vs current war difference

## Table B. Stakeholder comparison
Columns:
- war annual cost
- peace annual benefit
- peace minus war
- main positive channels
- main negative channels
- confidence range

## Table C. Channel decomposition
Rows:
- direct damage
- trade
- energy
- shipping
- finance
- tourism/aviation
- humanitarian
- security
- productivity
- transfers

## Table D. Sensitivity matrix
Rows:
- conservative
- base
- upside
- escalation
- partial peace
- full integration

---

## 19. What not to do

Do not:
- assume peace eliminates defense spending
- count price transfers as net world gains
- treat Iran's wartime oil windfalls, tolls, or leverage as automatic gains to the world economy
- mix nominal revenue effects with real welfare without labeling them
- assume all peace benefits arrive immediately
- assume all sanctions relief automatically becomes real trade
- ignore neighboring-country burdens
- bury Gulf countries inside one undifferentiated bucket
- present exact-looking numbers without scenario bands

---

## 20. Bottom line

The cleanest way to model the costs of war and the benefits of peace is to:

1. define a common scenario ladder  
2. calculate impacts using the same accounting framework in every scenario  
3. separate **real resource effects**, **transfers**, and **risk effects**  
4. use a hybrid stack of **event studies**, **structural gravity**, **MRIO/CGE**, and **direct damage accounting**  
5. report results for both the **world economy** and for each **stakeholder**  
6. compare **war versus peace** directly, rather than estimating either one in isolation  

That structure is broad enough to capture the true economics, but disciplined enough to remain credible.

---

## References

[^wto-thoenig]: Mathias Thoenig, *Trade Policy in the Shadow of War: A Quantitative Toolkit for Geoeconomics*, WTO workshop paper, 2024. <https://www.wto.org/english/res_e/reser_e/gtdw_e/wkshop24_e/thoenig_e.pdf>

[^wb-iran]: Elena Ianchovichina, Shantayanan Devarajan, and Csilla Lakatos, *Lifting Economic Sanctions on Iran: Global Effects and Strategic Responses*, World Bank Policy Research Working Paper 7549, 2016. <https://documents.worldbank.org/curated/en/298681467999709496/pdf/WPS7549.pdf>

[^wb-ukraine]: Jean-François Guénette, M. Ayhan Kose, and Naotaka Sugawara, *Implications of the War in Ukraine for the Global Economy*, World Bank, 2022. <https://thedocs.worldbank.org/en/doc/5d903e848db1d1b83e0ec8f744e55570-0350012021/related/Implications-of-the-War-in-Ukraine-for-the-Global-Economy.pdf>

[^unctad-rmt]: UNCTAD, *Review of Maritime Transport 2024*, especially the sections on chokepoint disruptions and shipping-cost pass-through. <https://unctad.org/system/files/official-document/rmt2024_en.pdf>

[^imf-gpr]: IMF, *Global Financial Stability Report, April 2025*, Chapter 2: *Geopolitical Risks: Implications for Asset Prices and Financial Stability*. <https://www.imf.org/-/media/files/publications/gfsr/2025/april/english/ch2.pdf>

[^imf-peacedividend]: Benedict Clements, Sanjeev Gupta, and Gabriela Inchauste, *Military Spending, the Peace Dividend, and Fiscal Adjustment*, IMF Working Paper. <https://www.elibrary.imf.org/openurl.pagedlist.gridpager/2851?t%3Astate%3Aclient=2yxv%2FUiZ9D0gq0S9l1DwZnb3dM4%3D%3AH4sIAAAAAAAAAD2QsUoDQRCGJ4khiVoYEX0BWzemEAQRBeHIkVMDwd7hbrzbsLe77k6SS2Nr6Yv4EuITWGprbWdl5R6CUwzz%2Fww%2F38zzF7SXawDQ8A7GxuUCLaYFCUZLnt3qSEjN5DQq4cktZEpeXChJmifkvPQcpkiSyqZsHOYUl1btj2n1%2Fr331Pn8eWxCK4GN1JTW6LAaZwzbyQwXOFCo88GUndT5SQK9uzrkCku6hwdoJNC1Ie1fV9Yy9I0lfePUBF3wA5Vn6Fz%2FeQG%2FX8eKOUslRuiLS7TtzsfL6+7tWwuaEawrg1mEaeCMoceFI18YlVX27Bzq2lx2Q9+qf8HQzkk7YtiZmXl9POpMeq9Ph4fD44PqF78kSIU2AQAA>


[^reuters-waiver]: Reuters, *India's Reliance buys 5 million barrels of Iranian oil after US waiver, sources say*, 24 March 2026. Reuters reported a 30-day U.S. waiver for Iranian oil already at sea as of March 20 and described a 5 million barrel purchase at a premium to Brent; a later Reuters report noted that Reliance denied buying Iranian-origin oil. <https://www.reuters.com/business/energy/indias-reliance-buys-5-million-barrels-iranian-oil-after-us-waiver-sources-say-2026-03-24/>; see also <https://www.reuters.com/business/energy/reliance-denies-purchase-iranian-origin-oil-2026-03-26/>

[^reuters-hormuz-transit]: Reuters, *Iran tells UN: 'non-hostile' ships can transit Strait of Hormuz*, 24 March 2026. <https://www.reuters.com/world/middle-east/iran-says-non-hostile-ships-can-transit-strait-hormuz-ft-reports-2026-03-24/>

[^reuters-hormuz-talks]: Reuters, *Pakistan hosts regional powers for Iran talks, with focus on Hormuz proposals*, 29 March 2026. Reuters reported that proposals under discussion included Suez Canal-style shipping tolls and a possible oil-flow management arrangement. <https://www.reuters.com/world/asia-pacific/pakistan-hosts-regional-powers-iran-talks-with-focus-hormuz-proposals-2026-03-29/>


[^sipri-2024]: SIPRI, *Trends in World Military Expenditure, 2024*. <https://www.sipri.org/sites/default/files/2025-04/2504_fs_milex_2024.pdf>

[^eia-hormuz-oil]: U.S. Energy Information Administration, *Amid regional conflict, the Strait of Hormuz remains critical to global energy security*, 16 June 2025. <https://www.eia.gov/todayinenergy/detail.php?id=65504>

[^eia-hormuz-lng]: U.S. Energy Information Administration, *About one-fifth of global liquefied natural gas trade flows through the Strait of Hormuz*, 24 June 2025. <https://www.eia.gov/todayinenergy/detail.php?id=65584>

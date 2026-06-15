/**
 * analogyBank.js
 * Curated first-introduction analogies for ~65 core GCSE / A-Level concepts.
 * Each entry maps a topic keyword to a one-sentence analogy that creates
 * genuine "ohh" moments — the kind that make a concept snap into place.
 *
 * LOOKUP: lookupAnalogy(topic) — exact match first, then substring fallback.
 * Injected into the system prompt when Aeva introduces a concept for the
 * first time this session (topic not yet in sessionConceptsRef).
 */

export const ANALOGY_BANK = {

  // ── MATHS ──────────────────────────────────────────────────────────────────

  'discriminant':
    'Think of the discriminant like a bridge-load test — positive means two safe crossing points (two real roots), zero means the bridge just barely holds (one repeated root), negative means it collapses before you cross (no real roots).',

  'quadratic formula':
    'The quadratic formula is like a universal master key — no matter what the quadratic locks look like, this one key always opens them, as long as you read off the right a, b, and c.',

  'completing the square':
    'Completing the square is like rearranging a rectangular carpet into a square room — you add a corner piece to make a perfect square, then subtract the extra corner you added so the total area stays the same.',

  'differentiation':
    'The derivative is the speedometer of a graph — it tells you exactly how fast the curve is climbing or falling at any single instant, the way a car\'s speedometer shows speed at one moment rather than total distance.',

  'integration':
    'Integration is like filling a swimming pool by adding infinitely many paper-thin vertical slices of water — the integral is the total volume once all those invisible slices are summed.',

  'chain rule':
    'The chain rule is like a set of gears — if the outer gear turns at one rate and the inner gear turns at another, the combined effect on the output shaft is the product of all the gear ratios.',

  'product rule':
    'Think of the product rule like calculating the area of a rectangle whose sides are both growing — the total change in area is (one side × how fast the other is growing) plus (other side × how fast the first is growing).',

  'logarithm':
    'A logarithm is the "undo" button for an exponent — if exponentiation asks "what do I get by raising b to the power n?", log base b asks "what power of b gives me this number?"',

  'vector':
    'A vector is like a delivery instruction — not just a distance ("go 5 km") but a direction too ("go 5 km north-east"), so two vectors pointing the same distance in different directions are completely different.',

  'standard deviation':
    'Standard deviation is like the average distance from the bullseye on a dartboard — it measures how spread out your throws are around the centre, regardless of which direction they missed.',

  'normal distribution':
    'The normal distribution is like heights in a large population — most people cluster near the average, with fewer and fewer as you go to extremes in either direction, creating a symmetric bell that\'s wide or narrow depending on how varied the group is.',

  'geometric sequence':
    'A geometric sequence is like bacteria doubling every hour — each generation multiplies by the same fixed ratio, so the numbers explode exponentially rather than just climbing in equal steps.',

  'arithmetic sequence':
    'An arithmetic sequence is like climbing a staircase at a constant pace — each step adds exactly the same height, so the total rise after n steps is simply n times the step height.',

  'surd':
    'A surd is like the exact diagonal of a unit square — √2 is the precise length, and no fraction can ever capture it exactly, so we keep it in root form rather than rounding.',

  'trigonometry':
    'Sine, cosine and tangent are like the three shadow measurements of a right triangle — depending on which angle you\'re standing at, they give you the exact ratio between different pairs of sides.',

  'radian':
    'A radian measures an angle by arc length rather than degree marks — one radian is the angle that cuts off an arc exactly as long as the radius, so a full circle sweeps an arc of 2π radii.',

  'matrix':
    'A matrix is like a coordinate transformation machine — multiply a vector by a matrix and it gets stretched, rotated, or reflected, all in one step.',

  'complex number':
    'Complex numbers are like a 2D address system for numbers — instead of a position on a single number line you have coordinates (real, imaginary), which lets you describe rotation and scaling in a way real numbers alone cannot.',

  'probability':
    'Probability is like a long-run frequency — if you flip a fair coin one million times, roughly half will be heads. The probability is the value that fraction converges to as the experiment runs longer and longer.',

  // ── PHYSICS ────────────────────────────────────────────────────────────────

  'momentum':
    'Momentum is like a moving truck vs a moving bicycle at the same speed — the truck has far more momentum because mass amplifies how hard it is to stop, which is why the same braking force takes much longer to halt the truck.',

  'conservation of momentum':
    'Think of two ice skaters pushing off each other — neither gains momentum from nowhere. Whatever one gains forward, the other gains backward in exact proportion, and the total always stays zero.',

  'inertia':
    'Inertia is like a book on a tablecloth — when you yank the cloth, the book resists the change and stays put. That same reluctance to change state applies to everything with mass.',

  'newton\'s second law':
    'F = ma is like a shopping trolley — the harder you push (force), the faster it accelerates; but a fully loaded trolley accelerates far less than an empty one under the same push.',

  'newton\'s third law':
    'Newton\'s third law is like pushing against a wall — the wall pushes back on your hand with exactly the same force. You feel it because your hand has far less mass than the wall, so it accelerates more.',

  'gravitational potential energy':
    'Gravitational PE is like a compressed spring you haven\'t let go yet — energy is stored silently in the position, ready to convert entirely into kinetic energy the moment the object falls.',

  'wave':
    'A wave is like a Mexican wave in a stadium — the people (medium) move up and down in their own seat, but the pattern (the wave itself) travels sideways across the crowd. The medium doesn\'t travel with the wave.',

  'superposition':
    'Superposition is like two people talking in a room — their sound waves add wherever they overlap. Two peaks together make a louder point (constructive), while a peak meeting a trough cancels to silence (destructive).',

  'electric field':
    'An electric field is like a gravitational field but for charges instead of masses — the field lines show the direction a positive test charge would be pushed, spreading out from positives and converging into negatives.',

  'resistance':
    'Resistance is like a narrow pipe in a plumbing system — the narrower and longer the pipe, the harder it is for water (current) to flow through, and the more pressure (voltage) you need to push the same flow rate.',

  'capacitor':
    'A capacitor is like a water tank with a stretchy membrane — it stores charge the way a tank stores water under pressure, building up until you disconnect it, then releasing that stored charge when the circuit needs it.',

  'nuclear fission':
    'Nuclear fission is like splitting a water droplet that\'s too large to stay together — the heavy nucleus is unstable, and when it splits, the binding energy that held it together is suddenly released as heat and radiation.',

  'half-life':
    'Half-life is like radioactive money — every fixed period, half of whatever is left decays. After ten half-lives, barely 0.1% of the original remains, regardless of how much you started with.',

  'simple harmonic motion':
    'SHM is like a pendulum — it always accelerates back towards the equilibrium point (restoring force), and the further it strays, the stronger that pull back, which is exactly why it oscillates rather than drifting.',

  'centripetal force':
    'Centripetal force is like a ball on a string — without the tension pulling inward, the ball would fly off in a straight line. The force doesn\'t create the circular motion; it continuously bends a straight path into a circle.',

  'electromagnetic induction':
    'Electromagnetic induction is like a bicycle dynamo — moving a conductor through a magnetic field forces electrons to move along it, generating a current. No relative movement, no current.',

  'photoelectric effect':
    'The photoelectric effect is like a nightclub bouncer with a minimum-height rule — photons below the threshold frequency simply don\'t have enough energy to eject an electron, no matter how many of them arrive. Intensity can\'t compensate for insufficient frequency.',

  'pressure':
    'Pressure is like wearing snowshoes vs stilettos on snow — the same weight spread over snowshoes barely sinks in, but concentrated on a stiletto tip, it pierces straight through.',

  // ── CHEMISTRY ──────────────────────────────────────────────────────────────

  'covalent bond':
    'Covalent bonding is like two people sharing an umbrella — both atoms want electrons to fill their outer shell, so they share a pair, and both end up sheltered.',

  'ionic bond':
    'Ionic bonding is like a donation — one atom gives an electron to another, both become oppositely charged ions, and the opposite charges attract so strongly that they lock into a crystal lattice.',

  'metallic bonding':
    'Metallic bonding is like a lattice of positive ions floating in a sea of free electrons — the electron sea acts as glue holding the ions together, and because the electrons can flow freely, metals conduct electricity.',

  'electronegativity':
    'Electronegativity is like a tug-of-war for the shared electrons in a bond — the more electronegative atom pulls the electron pair closer to itself, creating a partial negative charge on its end of the bond.',

  'activation energy':
    'Activation energy is like a hill between two valleys — reactants have to climb over the energy hill to become products. A catalyst lowers the hill height, so more molecules have enough energy to cross.',

  'le chatelier\'s principle':
    'Le Chatelier\'s principle is like a crowd pushing against a door — if you stress the equilibrium by adding more reactants, the reaction shifts to push back by producing more products, partially cancelling the change.',

  'dynamic equilibrium':
    'Dynamic equilibrium is like a revolving door — people are constantly going in and out, but the number inside stays constant. Both the forward and reverse reactions keep running; their rates just become equal.',

  'redox':
    'Redox is like a relay race where electrons are the baton — the reducing agent hands over electrons (oxidises), and the oxidising agent receives them (reduces). One can\'t happen without the other.',

  'mole':
    'A mole is like a dozen, but astronomically bigger and designed for atoms — just as "12 eggs" is a convenient counting unit, "1 mole" means exactly 6.02×10²³ particles, because atoms are so tiny you need that many to get a weighable amount.',

  'ph':
    'pH is like a reverse logarithmic volume dial for hydrogen ions — pH 0 is maximum acidity (most H⁺ ions), pH 14 is maximum alkalinity (fewest H⁺), and crucially each step of 1 represents a tenfold change in concentration.',

  'enthalpy':
    'Enthalpy change is like a bank account for heat — exothermic reactions are deposits (heat paid out to surroundings, negative ΔH), endothermic reactions are withdrawals (heat taken in from surroundings, positive ΔH).',

  'chromatography':
    'Chromatography is like a race between molecules — each compound in a mixture has a different affinity for the stationary phase vs the mobile phase, so they travel at different speeds and naturally separate.',

  'polymerisation':
    'Polymerisation is like snapping together LEGO bricks — small monomer units click together repeatedly to form a long polymer chain, with each brick an identical repeating unit.',

  // ── BIOLOGY ────────────────────────────────────────────────────────────────

  'photosynthesis':
    'A leaf is a solar panel that converts sunlight into sugar instead of electricity — chloroplasts are the solar cells, CO₂ and water are the raw materials, and glucose is the stored energy the plant lives off.',

  'respiration':
    'Cellular respiration is like burning fuel in an engine — glucose is the fuel, oxygen allows the engine to run at full efficiency, and ATP is the usable energy output that powers everything the cell does.',

  'dna replication':
    'DNA replication is like unzipping a zip and making two identical copies from each half — the double helix unzips, and each strand acts as a template so free nucleotides click into place on both sides.',

  'protein synthesis':
    'Protein synthesis is a two-step copy-and-build process — first the gene is photocopied into mRNA (transcription), then that copy is carried to a ribosome where it\'s read like a recipe to assemble a protein (translation).',

  'natural selection':
    'Natural selection is like a filter — traits that help survival pass through to the next generation, harmful traits are screened out, and over many generations the population\'s character shifts towards whatever survives best.',

  'osmosis':
    'Osmosis is like water diffusing through a crowded doorway — water molecules move from where there are lots of them (dilute solution) through a semi-permeable membrane to where there are fewer (concentrated solution), until both sides balance.',

  'diffusion':
    'Diffusion is like perfume spreading through a room — molecules always move from where they\'re crowded (high concentration) to where they\'re sparse (low concentration), until they\'re evenly distributed.',

  'mitosis':
    'Mitosis is like photocopying a document — the cell duplicates all its DNA exactly and divides into two genetically identical daughter cells, with no information lost or changed.',

  'meiosis':
    'Meiosis is like shuffling a deck and dealing four unique hands — genetic material is reshuffled during crossing over, then separated into four cells each with half the original chromosomes, maximising genetic diversity.',

  'enzyme':
    'An enzyme is like a shaped lock — only the right substrate (key) fits the active site (keyhole). High temperature or wrong pH distorts the lock\'s shape (denaturing), so even the correct key no longer fits.',

  'antibody':
    'An antibody is like a custom-fitted handcuff — each antibody is shaped to bind to one specific antigen and tag it for destruction. Once your immune system has made the key, memory B cells keep a copy for a faster response next time.',

  'homeostasis':
    'Homeostasis is like a thermostat — your body constantly monitors temperature, glucose, and other variables, and fires corrective responses (sweating, insulin) to pull conditions back to a set point whenever they drift.',

  // ── ECONOMICS ──────────────────────────────────────────────────────────────

  'supply and demand':
    'Supply and demand is like a negotiation between sellers who always want a higher price and buyers who always want a lower one — the equilibrium price is where they reluctantly agree, and it shifts whenever either side changes their position.',

  'price elasticity':
    'Price elasticity is like a rubber band vs a steel rod — demand for luxuries stretches a lot when prices change (elastic), while demand for necessities like insulin or petrol barely moves no matter the price (inelastic).',

  'opportunity cost':
    'Opportunity cost is like choosing between two job offers — taking one permanently forfeits everything you would have gained from the other. The cost isn\'t money; it\'s the best alternative you gave up.',

  'marginal utility':
    'Marginal utility is like glasses of water when you\'re very thirsty — the first glass is incredibly valuable, the second less so, the third less still. Each extra unit gives you less additional satisfaction, which is why demand curves slope downward.',

  'externality':
    'An externality is like secondhand smoke — the cost (or benefit) spills over to bystanders who never chose to be involved, and the market price ignores them entirely, causing the market to over- or under-produce.',

  'comparative advantage':
    'Comparative advantage is like a team where one person is faster at everything — even so, the team produces more total output if each person focuses on what they\'re relatively better at, freeing the other to do what they\'re comparatively less bad at.',

  'inflation':
    'Inflation is like a slow leak in a balloon — the number of pounds stays the same but its purchasing power gradually deflates, so the same wage buys progressively less over time.',

  // ── COMPUTER SCIENCE ───────────────────────────────────────────────────────

  'recursion':
    'Recursion is like looking up a word in a dictionary and finding it defined using a word you also have to look up — each function call creates a smaller version of the same problem, until you hit a base case that defines itself directly.',

  'binary search':
    'Binary search is like guessing a number from 1 to 1000 by always guessing the middle — you eliminate half the remaining range with every guess, turning a 1000-step problem into at most 10 guesses.',

  'time complexity':
    'Big O notation is like estimating a road trip — O(n) is driving at constant speed (double the distance, double the time); O(n²) is having to visit every previous petrol station for each new mile (it gets catastrophically slow).',

  'object-oriented programming':
    'A class is like a blueprint for a house — the blueprint defines the rooms and features, and each actual house built from it (an object) has the same structure but its own specific contents and state.',

  'linked list':
    'A linked list is like a treasure hunt — each clue (node) contains its value and a pointer to the next clue. Unlike an array with numbered slots, there\'s no direct jump to position 5; you must follow the chain from the start.',

  'stack':
    'A stack is like a stack of plates — you can only add or remove from the top. The last plate you put on is the first one you take off: Last In, First Out.',

  'queue':
    'A queue is like a bus stop — people join at the back and leave from the front, so whoever arrived first leaves first: First In, First Out.',

  'binary':
    'Binary is like a light-switch counting system — instead of ten symbols (0-9) you only have two (0 = off, 1 = on). Each extra bit (switch) doubles your range, so 8 bits gives you 256 possible values.',

  // ── ENGLISH / LITERARY ─────────────────────────────────────────────────────

  'metaphor':
    'A metaphor is a shortcut for experience — saying "he was a volcano" instantly transfers heat, pressure, and imminent explosion in one image, rather than listing adjectives like "very angry and likely to erupt".',

  'imagery':
    'Imagery is like a film director\'s shot list — the writer chooses specific sensory details (what you see, hear, smell, feel) to build the scene in your mind rather than just telling you what happened.',

  'dramatic irony':
    'Dramatic irony is like watching a horror film where the audience knows the killer is behind the door but the character doesn\'t — the gap between what we know and what the character knows is where all the tension lives.',

  'iambic pentameter':
    'Iambic pentameter is like a heartbeat rhythm — da-DUM da-DUM da-DUM da-DUM da-DUM, ten syllables with alternating light and heavy stress, which gives Shakespeare\'s verse its natural, speech-like pulse.',

  'allegory':
    'An allegory is like a fable with a longer memory — every character and event in the surface story maps precisely to a deeper idea (political, moral, philosophical), so the narrative operates on two levels simultaneously.',

  'soliloquy':
    'A soliloquy is like a character turning the stage lights off and speaking directly to you — the other characters can\'t hear it, making it the most honest, unguarded access you ever get to their true thoughts.',

}

/**
 * Look up an analogy for a given topic.
 * Tries exact match first, then substring matching in both directions.
 * Returns the analogy string or null if nothing matches.
 */
export function lookupAnalogy(topic) {
  if (!topic) return null
  const t = topic.toLowerCase().trim()

  // 1. Exact match
  if (ANALOGY_BANK[t]) return ANALOGY_BANK[t]

  // 2. Substring match: bank key inside topic string or topic inside bank key
  for (const [key, analogy] of Object.entries(ANALOGY_BANK)) {
    if (t.includes(key) || key.includes(t)) return analogy
  }

  return null
}

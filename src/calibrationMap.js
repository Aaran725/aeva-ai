/**
 * calibrationMap.js
 * Skill node graph for Aeva Calibration Diagnostic.
 *
 * Each node:
 *   label        — display name
 *   subject      — which subject
 *   band         — curriculum band label
 *   bandOrder    — numeric sort order (lower = easier)
 *   prerequisites — skill IDs that should be solid before this
 *   nextSkills   — skill IDs that unlock after this
 *   questions    — pre-written bank: { q, tier }  (tier 1=easy, 2=medium, 3=hard)
 *
 * Graph traversal starts at ENTRY_NODES[subject].
 */

// ─── MATHS ────────────────────────────────────────────────────────────────────
// bandOrder scale (maths): -6=Grade 1 → 0=Grade 7-8 → 1-9=GCSE/A-Level
const MATHS = {

  // ── PRIMARY (Grade 1–6 / Year 1–6) ─────────────────────────────────────────

  'counting-number': {
    label: 'Counting & Numbers',
    subject: 'maths', band: 'Grade 1', bandOrder: -6,
    prerequisites: [],
    nextSkills: ['addition-subtraction'],
    questions: [
      { q: 'What number comes after 19? And what number comes before 30?', tier: 1 },
      { q: 'Count back from 50 in 5s. Write the first 6 numbers.', tier: 2 },
      { q: 'I have 3 bags. Each bag has 4 apples. How many apples altogether? Explain how you know.', tier: 3 },
    ],
  },

  'addition-subtraction': {
    label: 'Addition & Subtraction',
    subject: 'maths', band: 'Grade 1–2', bandOrder: -5,
    prerequisites: ['counting-number'],
    nextSkills: ['place-value', 'times-tables'],
    questions: [
      { q: 'What is 7 + 8? What is 15 − 6?', tier: 1 },
      { q: 'A box has 24 crayons. 9 get lost. How many are left? Show your working.', tier: 2 },
      { q: 'True or false: 38 + 47 = 85. If false, what is the correct answer? Show how you worked it out.', tier: 3 },
    ],
  },

  'place-value': {
    label: 'Place Value',
    subject: 'maths', band: 'Grade 2–3', bandOrder: -5,
    prerequisites: ['addition-subtraction'],
    nextSkills: ['times-tables', 'multiplication-division'],
    questions: [
      { q: 'What is the value of the digit 4 in the number 3,482?', tier: 1 },
      { q: 'Write these numbers in order from smallest to largest: 1,024 · 1,240 · 1,042 · 1,204', tier: 2 },
      { q: 'A number has 5 thousands, 3 hundreds, 0 tens and 7 ones. Write it down and round it to the nearest hundred.', tier: 3 },
    ],
  },

  'times-tables': {
    label: 'Times Tables',
    subject: 'maths', band: 'Grade 3', bandOrder: -4,
    prerequisites: ['place-value'],
    nextSkills: ['multiplication-division', 'basic-fractions'],
    questions: [
      { q: 'What is 7 × 8? What is 9 × 6?', tier: 1 },
      { q: 'I think of a number, multiply by 7 and get 63. What was my number?', tier: 2 },
      { q: 'List all the factors of 36. Which are also multiples of 4?', tier: 3 },
    ],
  },

  'multiplication-division': {
    label: 'Multiplication & Division',
    subject: 'maths', band: 'Grade 4', bandOrder: -3,
    prerequisites: ['times-tables'],
    nextSkills: ['basic-fractions', 'decimals-intro', 'basic-area-perimeter'],
    questions: [
      { q: 'Work out 156 ÷ 12. Show your method.', tier: 1 },
      { q: 'A school orders 24 boxes of pencils. Each box has 36 pencils. How many pencils in total?', tier: 2 },
      { q: '576 students are split equally into groups of 8. Each group then splits into pairs. How many pairs are there in total?', tier: 3 },
    ],
  },

  'basic-fractions': {
    label: 'Fractions',
    subject: 'maths', band: 'Grade 3–4', bandOrder: -3,
    prerequisites: ['times-tables'],
    nextSkills: ['fractions-equivalent', 'decimals-intro'],
    questions: [
      { q: 'What is ½ of 24? What is ¼ of 36?', tier: 1 },
      { q: 'Which is larger: 3/5 or 5/8? Show how you decided.', tier: 2 },
      { q: 'A pizza is cut into 8 slices. Tom eats 3/8, Sara eats 1/4. What fraction is left? Write it in its simplest form.', tier: 3 },
    ],
  },

  'fractions-equivalent': {
    label: 'Equivalent Fractions & Mixed Numbers',
    subject: 'maths', band: 'Grade 4–5', bandOrder: -2,
    prerequisites: ['basic-fractions'],
    nextSkills: ['decimals-intro', 'number-basics'],
    questions: [
      { q: 'Are 3/4 and 9/12 equivalent? Explain why.', tier: 1 },
      { q: 'Convert 2 3/4 to an improper fraction. Then convert 17/5 to a mixed number.', tier: 2 },
      { q: 'Add: 1 2/3 + 2 3/4. Give your answer as a mixed number in its simplest form.', tier: 3 },
    ],
  },

  'decimals-intro': {
    label: 'Decimals',
    subject: 'maths', band: 'Grade 4–5', bandOrder: -2,
    prerequisites: ['fractions-equivalent'],
    nextSkills: ['negative-numbers', 'number-basics'],
    questions: [
      { q: 'Put these in order from smallest to largest: 0.5 · 0.15 · 0.505 · 0.051', tier: 1 },
      { q: 'Work out: 3.6 × 0.4. Show your working.', tier: 2 },
      { q: 'A ribbon is 4.2 m long. I cut off three pieces each 0.85 m long. How much ribbon is left?', tier: 3 },
    ],
  },

  'negative-numbers': {
    label: 'Negative Numbers',
    subject: 'maths', band: 'Grade 5–6', bandOrder: -1,
    prerequisites: ['decimals-intro'],
    nextSkills: ['number-basics', 'basic-algebra'],
    questions: [
      { q: 'What is −3 + 7? What is 4 − 9?', tier: 1 },
      { q: 'The temperature is −6°C at midnight and rises 11°C by noon. What is the temperature at noon?', tier: 2 },
      { q: 'Put these in order: −4, 2, −7, 0, −1, 5. Then find the sum of all six numbers.', tier: 3 },
    ],
  },

  'basic-area-perimeter': {
    label: 'Area & Perimeter',
    subject: 'maths', band: 'Grade 4–5', bandOrder: -2,
    prerequisites: ['multiplication-division'],
    nextSkills: ['angles-shapes'],
    questions: [
      { q: 'Find the area and perimeter of a rectangle 6 cm wide and 9 cm tall.', tier: 1 },
      { q: 'A square has a perimeter of 36 cm. What is its area?', tier: 2 },
      { q: 'An L-shaped room is made from two rectangles: one is 5 m × 3 m and the other is 2 m × 4 m. Find the total area and perimeter.', tier: 3 },
    ],
  },

  'angles-shapes': {
    label: 'Angles & 2D Shapes',
    subject: 'maths', band: 'Grade 5–6', bandOrder: -1,
    prerequisites: ['basic-area-perimeter'],
    nextSkills: ['statistics-basics'],
    questions: [
      { q: 'A triangle has angles of 90° and 35°. What is the third angle?', tier: 1 },
      { q: 'The angles of a quadrilateral are 110°, 85°, 70°, and x°. Find x.', tier: 2 },
      { q: 'Explain why the exterior angles of any polygon always sum to 360°. Use a regular hexagon as your example.', tier: 3 },
    ],
  },

  'statistics-basics': {
    label: 'Statistics & Data',
    subject: 'maths', band: 'Grade 5–6', bandOrder: -1,
    prerequisites: ['angles-shapes'],
    nextSkills: ['coordinates-intro'],
    questions: [
      { q: 'Find the mean, median, mode and range of: 3, 7, 8, 2, 10, 7, 4', tier: 1 },
      { q: 'A class of 20 students scored a mean of 14 on a test. A new student joins and scores 18. What is the new class mean?', tier: 2 },
      { q: 'Two data sets both have a mean of 50. Set A has a range of 4, Set B has a range of 40. What does this tell you about the two sets?', tier: 3 },
    ],
  },

  'coordinates-intro': {
    label: 'Coordinates & Graphs',
    subject: 'maths', band: 'Grade 6', bandOrder: 0,
    prerequisites: ['statistics-basics', 'negative-numbers'],
    nextSkills: ['algebra-intro', 'straight-line-graphs'],
    questions: [
      { q: 'Plot the point (3, −2). Which quadrant does it lie in?', tier: 1 },
      { q: 'A square has three corners at (1,1), (4,1) and (4,4). What are the coordinates of the fourth corner?', tier: 2 },
      { q: 'Points A(0,0), B(4,0), C(4,3) form a triangle. Find its area and the length of side AC.', tier: 3 },
    ],
  },

  'algebra-intro': {
    label: 'Introduction to Algebra',
    subject: 'maths', band: 'Grade 7–8', bandOrder: 0,
    prerequisites: ['coordinates-intro'],
    nextSkills: ['basic-algebra', 'linear-equations'],
    questions: [
      { q: 'If n = 5, find the value of 3n − 2.', tier: 1 },
      { q: 'Simplify: 4a + 3b − a + 5b', tier: 2 },
      { q: 'Write an expression for the perimeter of a rectangle where the length is (2x + 1) and the width is (x − 3). Expand and simplify.', tier: 3 },
    ],
  },

  // ── EXISTING GCSE / A-Level nodes ──────────────────────────────────────────

  'number-basics': {
    label: 'Number & Place Value',
    subject: 'maths', band: 'Foundation', bandOrder: 1,
    prerequisites: ['decimals-intro', 'negative-numbers'],
    nextSkills: ['fractions', 'percentages'],
    questions: [
      { q: 'What is 347 × 8?', tier: 1 },
      { q: 'Write 0.045 as a fraction in its simplest form.', tier: 2 },
      { q: 'A number rounded to 2 significant figures is 4200. What is the smallest it could be?', tier: 3 },
    ],
  },

  'fractions': {
    label: 'Fractions',
    subject: 'maths', band: 'GCSE Foundation', bandOrder: 2,
    prerequisites: ['number-basics'],
    nextSkills: ['percentages', 'ratio'],
    questions: [
      { q: 'Calculate: 2/3 + 3/4', tier: 1 },
      { q: 'Calculate: 1 3/5 × 2 1/2', tier: 2 },
      { q: 'Divide 2/3 ÷ 4/9 and give your answer as a mixed number.', tier: 3 },
    ],
  },

  'percentages': {
    label: 'Percentages',
    subject: 'maths', band: 'GCSE Foundation', bandOrder: 2,
    prerequisites: ['fractions'],
    nextSkills: ['ratio', 'basic-algebra'],
    questions: [
      { q: 'Find 35% of 240.', tier: 1 },
      { q: 'A jacket costs £80 after a 20% discount. What was the original price?', tier: 2 },
      { q: 'A population grows from 12000 to 13560 in a year. What is the percentage increase?', tier: 3 },
    ],
  },

  'ratio': {
    label: 'Ratio & Proportion',
    subject: 'maths', band: 'GCSE Foundation', bandOrder: 3,
    prerequisites: ['fractions'],
    nextSkills: ['basic-algebra'],
    questions: [
      { q: 'Share £120 in the ratio 3:5.', tier: 1 },
      { q: 'If 4 workers take 6 days to finish a job, how long would 3 workers take?', tier: 2 },
      { q: 'Two quantities are in the ratio 2:3. If the larger is increased by 10 and the ratio becomes 1:2, find the original smaller quantity.', tier: 3 },
    ],
  },

  'basic-algebra': {
    label: 'Basic Algebra',
    subject: 'maths', band: 'GCSE Foundation', bandOrder: 3,
    prerequisites: ['number-basics'],
    nextSkills: ['linear-equations', 'expanding-brackets'],
    questions: [
      { q: 'Simplify: 3x + 2y − x + 4y', tier: 1 },
      { q: 'If p = 3 and q = −2, find the value of 2p² − 3q.', tier: 2 },
      { q: 'Factorise fully: 12x²y − 8xy²', tier: 3 },
    ],
  },

  'linear-equations': {
    label: 'Linear Equations',
    subject: 'maths', band: 'GCSE Foundation', bandOrder: 4,
    prerequisites: ['basic-algebra'],
    nextSkills: ['simultaneous-equations', 'inequalities', 'expanding-brackets'],
    questions: [
      { q: 'Solve: 3x + 7 = 22', tier: 1 },
      { q: 'Solve: 2(x + 3) = 5x − 9', tier: 2 },
      { q: 'Solve: x/3 + 2 = x/4 + 5', tier: 3 },
    ],
  },

  'expanding-brackets': {
    label: 'Expanding & Factorising',
    subject: 'maths', band: 'GCSE Foundation', bandOrder: 4,
    prerequisites: ['basic-algebra'],
    nextSkills: ['quadratic-factorising', 'completing-the-square'],
    questions: [
      { q: 'Expand and simplify: (x + 3)(x − 5)', tier: 1 },
      { q: 'Expand and simplify: (2x − 1)(3x + 4)', tier: 2 },
      { q: 'Expand and simplify: (x + 2)³', tier: 3 },
    ],
  },

  'inequalities': {
    label: 'Inequalities',
    subject: 'maths', band: 'GCSE Higher', bandOrder: 5,
    prerequisites: ['linear-equations'],
    nextSkills: ['quadratic-inequalities'],
    questions: [
      { q: 'Solve: 3x − 4 < 11 and show the solution on a number line.', tier: 1 },
      { q: 'Solve: 2x + 1 ≤ 3x − 5 and find the smallest integer that satisfies it.', tier: 2 },
      { q: 'Find all integers n such that −3 < 2n − 1 ≤ 7.', tier: 3 },
    ],
  },

  'simultaneous-equations': {
    label: 'Simultaneous Equations',
    subject: 'maths', band: 'GCSE Higher', bandOrder: 5,
    prerequisites: ['linear-equations'],
    nextSkills: ['quadratic-simultaneous'],
    questions: [
      { q: 'Solve simultaneously: 2x + y = 7 and x − y = 2', tier: 1 },
      { q: 'Solve simultaneously: 3x + 2y = 12 and 5x − y = 7', tier: 2 },
      { q: 'Solve simultaneously: x/2 + y/3 = 4 and 2x − y = 6', tier: 3 },
    ],
  },

  'quadratic-factorising': {
    label: 'Quadratic Factorising',
    subject: 'maths', band: 'GCSE Higher', bandOrder: 5,
    prerequisites: ['expanding-brackets'],
    nextSkills: ['completing-the-square', 'quadratic-formula'],
    questions: [
      { q: 'Factorise: x² + 5x + 6', tier: 1 },
      { q: 'Factorise: 2x² + 7x + 3', tier: 2 },
      { q: 'Factorise: 6x² − x − 12', tier: 3 },
    ],
  },

  'completing-the-square': {
    label: 'Completing the Square',
    subject: 'maths', band: 'GCSE Higher', bandOrder: 6,
    prerequisites: ['quadratic-factorising'],
    nextSkills: ['quadratic-formula', 'quadratic-graphs'],
    questions: [
      { q: 'Complete the square: x² + 6x + 5', tier: 1 },
      { q: 'Complete the square: x² − 5x + 3', tier: 2 },
      { q: 'Complete the square: 2x² + 8x − 3', tier: 3 },
    ],
  },

  'quadratic-formula': {
    label: 'Quadratic Formula',
    subject: 'maths', band: 'GCSE Higher', bandOrder: 6,
    prerequisites: ['completing-the-square'],
    nextSkills: ['discriminant', 'quadratic-simultaneous'],
    questions: [
      { q: 'Solve using the quadratic formula: x² − 5x + 6 = 0', tier: 1 },
      { q: 'Solve using the quadratic formula: 2x² + 3x − 2 = 0', tier: 2 },
      { q: 'Solve 3x² − 7x + 1 = 0, giving your answer to 3 significant figures.', tier: 3 },
    ],
  },

  'discriminant': {
    label: 'Discriminant',
    subject: 'maths', band: 'GCSE Higher', bandOrder: 7,
    prerequisites: ['quadratic-formula'],
    nextSkills: ['further-algebra'],
    questions: [
      { q: 'How many solutions does x² + 4x + 4 = 0 have? Show using the discriminant.', tier: 1 },
      { q: 'Find the values of k for which x² + kx + 9 = 0 has equal roots.', tier: 2 },
      { q: 'Show that 2x² − 3x + 4 = 0 has no real solutions and explain geometrically why.', tier: 3 },
    ],
  },

  'quadratic-graphs': {
    label: 'Quadratic Graphs',
    subject: 'maths', band: 'GCSE Higher', bandOrder: 6,
    prerequisites: ['quadratic-factorising'],
    nextSkills: ['discriminant', 'transformations'],
    questions: [
      { q: 'State the coordinates of the turning point of y = (x − 2)² + 3.', tier: 1 },
      { q: 'Sketch y = x² − 4x + 3, labelling roots and turning point.', tier: 2 },
      { q: 'Find the equation of the line of symmetry of y = 2x² − 8x + 5.', tier: 3 },
    ],
  },

  'straight-line-graphs': {
    label: 'Straight Line Graphs',
    subject: 'maths', band: 'GCSE Foundation', bandOrder: 4,
    prerequisites: ['linear-equations'],
    nextSkills: ['quadratic-graphs', 'transformations'],
    questions: [
      { q: 'Find the gradient and y-intercept of 3x + 2y = 12.', tier: 1 },
      { q: 'Find the equation of the line through (2, 5) and (4, 11).', tier: 2 },
      { q: 'A line is perpendicular to y = 3x − 2 and passes through (6, 1). Find its equation.', tier: 3 },
    ],
  },

  'trigonometry': {
    label: 'Trigonometry (SOH CAH TOA)',
    subject: 'maths', band: 'GCSE Higher', bandOrder: 6,
    prerequisites: ['straight-line-graphs'],
    nextSkills: ['sine-cosine-rule', 'trig-identities'],
    questions: [
      { q: 'In a right triangle, the opposite side is 5 and hypotenuse is 13. Find the angle.', tier: 1 },
      { q: 'A ladder 8m long leans against a wall at 65°. How high up the wall does it reach?', tier: 2 },
      { q: 'Find all angles between 0° and 360° for which sin(x) = −0.5.', tier: 3 },
    ],
  },

  'sine-cosine-rule': {
    label: 'Sine & Cosine Rule',
    subject: 'maths', band: 'GCSE Higher', bandOrder: 7,
    prerequisites: ['trigonometry'],
    nextSkills: ['trig-identities', 'vectors'],
    questions: [
      { q: 'In triangle ABC, a = 7, b = 5, C = 40°. Find side c.', tier: 1 },
      { q: 'In triangle PQR, p = 9, q = 12, r = 15. Find angle P.', tier: 2 },
      { q: 'Find the area of a triangle with sides 8, 11 and included angle 62°.', tier: 3 },
    ],
  },

  'surds': {
    label: 'Surds',
    subject: 'maths', band: 'GCSE Higher', bandOrder: 6,
    prerequisites: ['basic-algebra'],
    nextSkills: ['further-algebra'],
    questions: [
      { q: 'Simplify: √72', tier: 1 },
      { q: 'Rationalise the denominator: 5 / (2 + √3)', tier: 2 },
      { q: 'Show that (√5 + √2)² = 7 + 2√10', tier: 3 },
    ],
  },

  'trig-identities': {
    label: 'Trig Identities',
    subject: 'maths', band: 'GCSE Higher', bandOrder: 7,
    prerequisites: ['trigonometry'],
    nextSkills: ['further-trig', 'sine-cosine-rule'],
    questions: [
      { q: 'State the identity: sin²θ + cos²θ = ?', tier: 1 },
      { q: 'Prove that (sinθ + cosθ)² = 1 + 2sinθcosθ.', tier: 2 },
      { q: 'Solve sinθ/cosθ = 2sinθ for 0° ≤ θ ≤ 360°.', tier: 3 },
    ],
  },

  'further-algebra': {
    label: 'Further Algebra',
    subject: 'maths', band: 'A-Level', bandOrder: 8,
    prerequisites: ['discriminant', 'surds'],
    nextSkills: ['calculus-intro', 'binomial'],
    questions: [
      { q: 'Simplify: (x² − 9) / (x² + x − 6)', tier: 1 },
      { q: 'Express (3x + 1) / ((x+1)(x−2)) in partial fractions.', tier: 2 },
      { q: 'Prove that n² + n is always even for any integer n.', tier: 3 },
    ],
  },

  'calculus-intro': {
    label: 'Differentiation',
    subject: 'maths', band: 'A-Level', bandOrder: 8,
    prerequisites: ['further-algebra'],
    nextSkills: ['integration', 'calculus-applications'],
    questions: [
      { q: 'Differentiate: y = 3x⁴ − 5x² + 2x − 7', tier: 1 },
      { q: 'Find the gradient of y = x³ − 4x + 1 at x = 2.', tier: 2 },
      { q: 'Find the coordinates of the stationary points of y = x³ − 6x² + 9x + 1 and determine their nature.', tier: 3 },
    ],
  },

  'integration': {
    label: 'Integration',
    subject: 'maths', band: 'A-Level', bandOrder: 9,
    prerequisites: ['calculus-intro'],
    nextSkills: ['calculus-applications'],
    questions: [
      { q: 'Find: ∫(4x³ − 2x + 5) dx', tier: 1 },
      { q: 'Evaluate: ∫₁³ (x² + 2x) dx', tier: 2 },
      { q: 'Find the area enclosed between y = x² and y = x + 2.', tier: 3 },
    ],
  },

  'vectors': {
    label: 'Vectors',
    subject: 'maths', band: 'A-Level', bandOrder: 9,
    prerequisites: ['sine-cosine-rule'],
    nextSkills: [],
    questions: [
      { q: 'Find the magnitude of vector (3, −4, 0).', tier: 1 },
      { q: 'If a = 2i + j − 3k and b = i − 2j + k, find a · b.', tier: 2 },
      { q: 'Show that vectors (1, 2, 3) and (2, 1, −4/3) are perpendicular.', tier: 3 },
    ],
  },

  // ── A-LEVEL GAPS (previously missing) ─────────────────────────────────────

  'logarithms': {
    label: 'Logarithms & Exponentials',
    subject: 'maths', band: 'A-Level', bandOrder: 8,
    prerequisites: ['further-algebra'],
    nextSkills: ['calculus-intro', 'sequences-series'],
    questions: [
      { q: 'Evaluate: log₂(32)', tier: 1 },
      { q: 'Solve: 3^(x+1) = 27^(x−1)', tier: 2 },
      { q: 'Solve: log₃(x + 4) + log₃(x − 2) = 3. State any restrictions on x.', tier: 3 },
    ],
  },

  'binomial-expansion': {
    label: 'Binomial Expansion',
    subject: 'maths', band: 'A-Level', bandOrder: 8,
    prerequisites: ['further-algebra'],
    nextSkills: ['sequences-series'],
    questions: [
      { q: 'Expand (1 + x)⁴ using the binomial theorem.', tier: 1 },
      { q: 'Find the coefficient of x³ in the expansion of (2 + x)⁵.', tier: 2 },
      { q: 'Find the first three terms of (1 − 2x)^(−½) in ascending powers of x. State the range of validity.', tier: 3 },
    ],
  },

  'sequences-series': {
    label: 'Sequences & Series',
    subject: 'maths', band: 'A-Level', bandOrder: 8,
    prerequisites: ['further-algebra'],
    nextSkills: [],
    questions: [
      { q: 'The 3rd term of an arithmetic sequence is 11 and the 7th term is 27. Find the first term and common difference.', tier: 1 },
      { q: 'A geometric series has first term 6 and common ratio 1/3. Find the sum to infinity.', tier: 2 },
      { q: 'Prove that the sum of the first n terms of an arithmetic series is n/2 × (2a + (n−1)d). Then find the least n for which the sum exceeds 1000, given a = 5, d = 3.', tier: 3 },
    ],
  },

  'mathematical-proof': {
    label: 'Mathematical Proof',
    subject: 'maths', band: 'A-Level', bandOrder: 8,
    prerequisites: ['further-algebra'],
    nextSkills: [],
    questions: [
      { q: 'Prove that the sum of any two odd numbers is even.', tier: 1 },
      { q: 'Disprove by counter-example: "n² + n + 41 is prime for all positive integers n."', tier: 2 },
      { q: 'Prove by contradiction that √2 is irrational.', tier: 3 },
    ],
  },

  'further-trig': {
    label: 'Further Trigonometry',
    subject: 'maths', band: 'A-Level', bandOrder: 9,
    prerequisites: ['trigonometry', 'trig-identities'],
    nextSkills: ['integration'],
    questions: [
      { q: 'Write sin(A + B) and cos(A + B) in expanded form.', tier: 1 },
      { q: 'Solve: 2sin²x − sinx − 1 = 0 for 0° ≤ x ≤ 360°.', tier: 2 },
      { q: 'Express 3sinx + 4cosx in the form Rsin(x + α), finding R and α. Hence find the maximum value and the x at which it occurs.', tier: 3 },
    ],
  },

  'parametric': {
    label: 'Parametric Equations',
    subject: 'maths', band: 'A-Level', bandOrder: 9,
    prerequisites: ['calculus-intro', 'completing-the-square'],
    nextSkills: [],
    questions: [
      { q: 'A curve is defined by x = t + 1, y = t² − 3. Find y when t = 2.', tier: 1 },
      { q: 'Convert x = 2cosθ, y = 3sinθ to a Cartesian equation.', tier: 2 },
      { q: 'A curve has parametric equations x = t², y = t³ − 3t. Find dy/dx in terms of t, and find the coordinates of the stationary points.', tier: 3 },
    ],
  },
}

// ─── PHYSICS ──────────────────────────────────────────────────────────────────
const PHYSICS = {
  'forces-basics': {
    label: 'Forces & Newton\'s Laws',
    subject: 'physics', band: 'GCSE Foundation', bandOrder: 2,
    prerequisites: [],
    nextSkills: ['momentum', 'energy'],
    questions: [
      { q: 'A force of 30 N acts on a 6 kg mass. What is the acceleration?', tier: 1 },
      { q: 'A 5 kg object is on a rough surface with friction 8 N. A 20 N horizontal force is applied. Find the acceleration.', tier: 2 },
      { q: 'Two forces act on an object: 12 N east and 5 N north. Find the resultant magnitude and direction.', tier: 3 },
    ],
  },

  'energy': {
    label: 'Energy & Work',
    subject: 'physics', band: 'GCSE Foundation', bandOrder: 3,
    prerequisites: ['forces-basics'],
    nextSkills: ['waves', 'electricity-basics'],
    questions: [
      { q: 'A 2 kg book is lifted 1.5 m. Calculate the gain in gravitational potential energy (g = 10 m/s²).', tier: 1 },
      { q: 'A car of mass 1200 kg accelerates from 0 to 20 m/s. Calculate the kinetic energy gained.', tier: 2 },
      { q: 'An object falls from rest through 45 m (ignore air resistance). Find its speed at the bottom using energy methods.', tier: 3 },
    ],
  },

  'momentum': {
    label: 'Momentum & Impulse',
    subject: 'physics', band: 'GCSE Higher', bandOrder: 4,
    prerequisites: ['forces-basics'],
    nextSkills: ['circular-motion'],
    questions: [
      { q: 'A 0.5 kg ball moving at 8 m/s collides and sticks to a stationary 1.5 kg ball. Find their combined velocity.', tier: 1 },
      { q: 'A force of 40 N acts for 0.3 s. Calculate the impulse and the change in momentum.', tier: 2 },
      { q: 'Two trolleys collide. Before: A (2 kg, 5 m/s right), B (3 kg, 2 m/s left). After: A is stationary. Find B\'s final velocity.', tier: 3 },
    ],
  },

  'electricity-basics': {
    label: 'Electricity & Circuits',
    subject: 'physics', band: 'GCSE Foundation', bandOrder: 3,
    prerequisites: [],
    nextSkills: ['electromagnetism', 'ac-dc'],
    questions: [
      { q: 'A 12 V battery drives a current of 3 A through a resistor. What is the resistance?', tier: 1 },
      { q: 'Two resistors of 4Ω and 6Ω are connected in parallel. Find the total resistance.', tier: 2 },
      { q: 'In a circuit, a 10Ω and 15Ω resistor are in parallel, and this combination is in series with 5Ω. Find the total resistance.', tier: 3 },
    ],
  },

  'waves': {
    label: 'Waves',
    subject: 'physics', band: 'GCSE Foundation', bandOrder: 3,
    prerequisites: ['energy'],
    nextSkills: ['optics', 'quantum'],
    questions: [
      { q: 'A wave has frequency 50 Hz and wavelength 0.4 m. What is its speed?', tier: 1 },
      { q: 'Explain the difference between transverse and longitudinal waves with one example of each.', tier: 2 },
      { q: 'A wave in deep water has speed 6 m/s and frequency 2 Hz. It moves into shallow water where speed drops to 4 m/s. Find the new wavelength.', tier: 3 },
    ],
  },

  'atomic-structure': {
    label: 'Atomic Structure & Radioactivity',
    subject: 'physics', band: 'GCSE Higher', bandOrder: 5,
    prerequisites: ['electricity-basics'],
    nextSkills: ['quantum', 'nuclear'],
    questions: [
      { q: 'A radioactive sample has a half-life of 3 hours. After 12 hours, what fraction of the original sample remains?', tier: 1 },
      { q: 'Compare alpha, beta, and gamma radiation in terms of penetrating power and ionising ability.', tier: 2 },
      { q: 'Carbon-14 has a half-life of 5730 years. A sample now has 1/8 of its original activity. How old is it?', tier: 3 },
    ],
  },

  'electromagnetism': {
    label: 'Electromagnetism',
    subject: 'physics', band: 'GCSE Higher', bandOrder: 5,
    prerequisites: ['electricity-basics'],
    nextSkills: ['ac-dc'],
    questions: [
      { q: 'State Fleming\'s left-hand rule and explain what each finger represents.', tier: 1 },
      { q: 'A wire of length 0.3 m carries 5 A in a field of 0.08 T perpendicular to it. Find the force on the wire.', tier: 2 },
      { q: 'A transformer has 500 primary turns and 2000 secondary turns. If the primary voltage is 230 V, find the secondary voltage and explain the assumption made.', tier: 3 },
    ],
  },

  'circular-motion': {
    label: 'Circular Motion',
    subject: 'physics', band: 'A-Level', bandOrder: 7,
    prerequisites: ['momentum', 'forces-basics'],
    nextSkills: ['simple-harmonic', 'gravitation'],
    questions: [
      { q: 'A 0.5 kg mass moves in a circle of radius 0.8 m at 4 m/s. Find the centripetal force.', tier: 1 },
      { q: 'A car travels over a hill of radius 50 m at 20 m/s. Find the normal reaction force if the car\'s mass is 800 kg.', tier: 2 },
      { q: 'A satellite orbits at height h above Earth. Derive an expression for its orbital speed in terms of g at that height and h.', tier: 3 },
    ],
  },
}

// ─── CHEMISTRY ────────────────────────────────────────────────────────────────
const CHEMISTRY = {
  'atomic-structure-chem': {
    label: 'Atomic Structure',
    subject: 'chemistry', band: 'GCSE Foundation', bandOrder: 1,
    prerequisites: [],
    nextSkills: ['periodic-table', 'bonding'],
    questions: [
      { q: 'How many protons, neutrons, and electrons does Carbon-12 have?', tier: 1 },
      { q: 'Explain the difference between an atom and an ion, with an example.', tier: 2 },
      { q: 'Chlorine has two isotopes: ³⁵Cl (75%) and ³⁷Cl (25%). Calculate the relative atomic mass.', tier: 3 },
    ],
  },

  'periodic-table': {
    label: 'Periodic Table & Trends',
    subject: 'chemistry', band: 'GCSE Foundation', bandOrder: 2,
    prerequisites: ['atomic-structure-chem'],
    nextSkills: ['bonding', 'reactions'],
    questions: [
      { q: 'Why do elements in Group 1 get more reactive as you go down the group?', tier: 1 },
      { q: 'Explain the trend in ionisation energy across Period 3.', tier: 2 },
      { q: 'Why does atomic radius decrease across a period but increase down a group?', tier: 3 },
    ],
  },

  'bonding': {
    label: 'Chemical Bonding',
    subject: 'chemistry', band: 'GCSE Higher', bandOrder: 3,
    prerequisites: ['periodic-table'],
    nextSkills: ['structure-properties', 'reactions'],
    questions: [
      { q: 'Draw a dot-and-cross diagram for the ionic bonding in NaCl.', tier: 1 },
      { q: 'Compare the properties of ionic and covalent compounds in terms of melting point and conductivity.', tier: 2 },
      { q: 'Explain why diamond is hard but graphite is slippery, despite both being forms of carbon.', tier: 3 },
    ],
  },

  'moles': {
    label: 'Moles & Calculations',
    subject: 'chemistry', band: 'GCSE Higher', bandOrder: 4,
    prerequisites: ['atomic-structure-chem'],
    nextSkills: ['reactions', 'concentration'],
    questions: [
      { q: 'Calculate the number of moles in 44 g of CO₂ (relative mass = 44).', tier: 1 },
      { q: 'In the reaction N₂ + 3H₂ → 2NH₃, how many grams of NH₃ are produced from 14 g of N₂?', tier: 2 },
      { q: '25 cm³ of 0.1 mol/dm³ NaOH neutralises HCl. Calculate the concentration of the HCl if 20 cm³ was used.', tier: 3 },
    ],
  },

  'reactions': {
    label: 'Chemical Reactions & Energy',
    subject: 'chemistry', band: 'GCSE Higher', bandOrder: 4,
    prerequisites: ['bonding', 'moles'],
    nextSkills: ['rates', 'equilibrium'],
    questions: [
      { q: 'What is the difference between exothermic and endothermic reactions? Give one example of each.', tier: 1 },
      { q: 'Using bond energies, calculate the enthalpy change for H₂ + Cl₂ → 2HCl. (H-H: 436, Cl-Cl: 242, H-Cl: 431 kJ/mol)', tier: 2 },
      { q: 'Explain Hess\'s Law and use it to calculate ΔH for C + O₂ → CO₂, given ΔH for CO₂ → CO and CO → CO₂.', tier: 3 },
    ],
  },

  'rates': {
    label: 'Rates of Reaction',
    subject: 'chemistry', band: 'GCSE Higher', bandOrder: 5,
    prerequisites: ['reactions'],
    nextSkills: ['equilibrium'],
    questions: [
      { q: 'List four factors that affect the rate of a chemical reaction.', tier: 1 },
      { q: 'Explain how a catalyst increases the rate of reaction without being used up.', tier: 2 },
      { q: 'Marble chips react with HCl. Explain why the rate is faster with powder than chips of the same mass.', tier: 3 },
    ],
  },

  'equilibrium': {
    label: 'Equilibrium & Le Chatelier',
    subject: 'chemistry', band: 'A-Level', bandOrder: 7,
    prerequisites: ['rates'],
    nextSkills: [],
    questions: [
      { q: 'State Le Chatelier\'s Principle.', tier: 1 },
      { q: 'N₂ + 3H₂ ⇌ 2NH₃ (ΔH = −92 kJ/mol). How does increasing temperature affect the position of equilibrium?', tier: 2 },
      { q: 'Write the Kc expression for 2SO₂ + O₂ ⇌ 2SO₃. If Kc = 280 at 1000K and [SO₂] = [O₂] = 0.1 mol/dm³, find [SO₃].', tier: 3 },
    ],
  },
}

// ─── BIOLOGY ──────────────────────────────────────────────────────────────────
const BIOLOGY = {
  'cell-structure': {
    label: 'Cell Structure',
    subject: 'biology', band: 'GCSE Foundation', bandOrder: 1,
    prerequisites: [],
    nextSkills: ['cell-transport', 'dna-genetics'],
    questions: [
      { q: 'Name three structures found in a plant cell but NOT in an animal cell.', tier: 1 },
      { q: 'Explain the function of mitochondria and ribosomes in a cell.', tier: 2 },
      { q: 'A student views two cells under a microscope — one with a cell wall and chloroplasts, one without. What can they conclude, and what further test would confirm the presence of DNA?', tier: 3 },
    ],
  },

  'cell-transport': {
    label: 'Cell Transport',
    subject: 'biology', band: 'GCSE Foundation', bandOrder: 2,
    prerequisites: ['cell-structure'],
    nextSkills: ['enzymes', 'breathing'],
    questions: [
      { q: 'Define osmosis and explain the direction of water movement across a semi-permeable membrane.', tier: 1 },
      { q: 'A red blood cell is placed in a concentrated salt solution. Describe and explain what happens.', tier: 2 },
      { q: 'Explain why active transport requires energy but osmosis does not, using what you know about concentration gradients.', tier: 3 },
    ],
  },

  'enzymes': {
    label: 'Enzymes',
    subject: 'biology', band: 'GCSE Foundation', bandOrder: 3,
    prerequisites: ['cell-transport'],
    nextSkills: ['digestion', 'dna-genetics'],
    questions: [
      { q: 'Explain the lock-and-key model of enzyme action.', tier: 1 },
      { q: 'Describe how increasing temperature above the optimum affects enzyme activity, and explain why.', tier: 2 },
      { q: 'An experiment tests enzyme activity at pH 4, 7, and 10. The enzyme works fastest at pH 7. Sketch the expected rate-vs-pH graph and explain the shape.', tier: 3 },
    ],
  },

  'dna-genetics': {
    label: 'DNA & Inheritance',
    subject: 'biology', band: 'GCSE Higher', bandOrder: 5,
    prerequisites: ['cell-structure'],
    nextSkills: ['evolution', 'genetic-engineering'],
    questions: [
      { q: 'What are the four bases in DNA? Which pairs with which?', tier: 1 },
      { q: 'Two heterozygous parents (Tt × Tt) have children. What is the probability of a child being tall (T dominant)? Use a Punnett square.', tier: 2 },
      { q: 'Cystic fibrosis is autosomal recessive. A carrier mother and unaffected father have four children — one has CF. Deduce the father\'s genotype.', tier: 3 },
    ],
  },

  'evolution': {
    label: 'Evolution & Natural Selection',
    subject: 'biology', band: 'GCSE Higher', bandOrder: 5,
    prerequisites: ['dna-genetics'],
    nextSkills: [],
    questions: [
      { q: 'Describe the four key steps in natural selection.', tier: 1 },
      { q: 'Antibiotic resistance in bacteria is an example of natural selection. Explain how it develops over generations.', tier: 2 },
      { q: 'Explain how geographical isolation could lead to the formation of two new species from one original population.', tier: 3 },
    ],
  },
}

// ─── HISTORY ──────────────────────────────────────────────────────────────────
const HISTORY = {
  'source-analysis': {
    label: 'Source Analysis',
    subject: 'history', band: 'Foundation', bandOrder: 1,
    prerequisites: [],
    nextSkills: ['causation', 'significance'],
    questions: [
      { q: 'What does it mean to evaluate the "provenance" of a historical source? Name two provenance factors.', tier: 1 },
      { q: 'A 1930s German newspaper praises Hitler\'s policies. How might you question its reliability as evidence of popular opinion?', tier: 2 },
      { q: 'Explain why a source being biased does not necessarily make it less historically useful. Use an example.', tier: 3 },
    ],
  },

  'causation': {
    label: 'Causation & Consequence',
    subject: 'history', band: 'Foundation', bandOrder: 2,
    prerequisites: ['source-analysis'],
    nextSkills: ['ww1-causes', 'ww2-causes'],
    questions: [
      { q: 'What is the difference between a short-term and long-term cause of a historical event?', tier: 1 },
      { q: 'Explain how nationalism contributed to tension in Europe before World War One.', tier: 2 },
      { q: 'Historians argue about whether WW1 was "inevitable." Using at least two causes, evaluate this claim.', tier: 3 },
    ],
  },

  'ww1-causes': {
    label: 'Causes of World War One',
    subject: 'history', band: 'GCSE', bandOrder: 3,
    prerequisites: ['causation'],
    nextSkills: ['ww1-trench', 'versailles'],
    questions: [
      { q: 'Name the four long-term causes of WW1 (MAIN).', tier: 1 },
      { q: 'Explain how the Alliance System turned a regional conflict into a world war.', tier: 2 },
      { q: '"The assassination of Franz Ferdinand was merely a spark, not a cause of WW1." How far do you agree?', tier: 3 },
    ],
  },

  'versailles': {
    label: 'Treaty of Versailles',
    subject: 'history', band: 'GCSE', bandOrder: 4,
    prerequisites: ['ww1-causes'],
    nextSkills: ['weimar', 'ww2-causes'],
    questions: [
      { q: 'Name two terms of the Treaty of Versailles that punished Germany.', tier: 1 },
      { q: 'Explain why many Germans felt the Treaty of Versailles was unfair.', tier: 2 },
      { q: 'Evaluate the extent to which the Treaty of Versailles caused the rise of Hitler.', tier: 3 },
    ],
  },

  'significance': {
    label: 'Significance & Change',
    subject: 'history', band: 'Foundation', bandOrder: 2,
    prerequisites: ['source-analysis'],
    nextSkills: ['causation'],
    questions: [
      { q: 'What makes a historical event "significant"? Give two criteria.', tier: 1 },
      { q: 'Was the invention of the printing press more significant in the short or long term? Explain.', tier: 2 },
      { q: 'Historians disagree on whether continuity or change is more important in history. What does this debate reveal about historical judgement?', tier: 3 },
    ],
  },
}

// ─── ENGLISH LITERATURE ───────────────────────────────────────────────────────
const ENGLISH_LIT = {
  'pee-structure': {
    label: 'PEE / PEEL Paragraphs',
    subject: 'english-lit', band: 'Foundation', bandOrder: 1,
    prerequisites: [],
    nextSkills: ['language-analysis', 'context'],
    questions: [
      { q: 'What do the letters P-E-E stand for in essay writing?', tier: 1 },
      { q: 'Write a PEE paragraph about the theme of power in any text you have studied.', tier: 2 },
      { q: 'Explain the difference between analysing a writer\'s technique and just describing what happens in the text.', tier: 3 },
    ],
  },

  'language-analysis': {
    label: 'Language Analysis',
    subject: 'english-lit', band: 'GCSE', bandOrder: 3,
    prerequisites: ['pee-structure'],
    nextSkills: ['context', 'structure-form'],
    questions: [
      { q: 'Identify the technique in: "The stars were cold, cruel eyes watching the soldiers." What is its effect?', tier: 1 },
      { q: 'Analyse how Dickens uses language in "It was the best of times, it was the worst of times" to establish theme.', tier: 2 },
      { q: 'Explain how a writer\'s choice of verb can convey more about character than their choice of adjective, using a quotation to support your view.', tier: 3 },
    ],
  },

  'context': {
    label: 'Historical Context',
    subject: 'english-lit', band: 'GCSE', bandOrder: 3,
    prerequisites: ['pee-structure'],
    nextSkills: ['themes-comparison'],
    questions: [
      { q: 'Why is knowing when and where a text was written useful when analysing it?', tier: 1 },
      { q: 'How does the context of the Victorian era affect the themes of a novel written in that period?', tier: 2 },
      { q: 'A student includes lots of context in their essay but doesn\'t link it to the text. Explain why this limits their mark and how they should use context instead.', tier: 3 },
    ],
  },

  'structure-form': {
    label: 'Structure & Form',
    subject: 'english-lit', band: 'GCSE Higher', bandOrder: 5,
    prerequisites: ['language-analysis'],
    nextSkills: ['themes-comparison'],
    questions: [
      { q: 'What is the effect of using first-person narration in a novel?', tier: 1 },
      { q: 'Explain how a sonnet\'s volta creates meaning and give an example.', tier: 2 },
      { q: 'Analyse how a writer\'s decision to end a chapter on a cliffhanger contributes to both structure and theme.', tier: 3 },
    ],
  },

  'themes-comparison': {
    label: 'Themes & Comparison',
    subject: 'english-lit', band: 'GCSE Higher', bandOrder: 6,
    prerequisites: ['context', 'structure-form'],
    nextSkills: [],
    questions: [
      { q: 'Name one theme from a text you have studied and explain how it is shown in one scene.', tier: 1 },
      { q: 'Compare how two poems present the theme of conflict. Refer to language, structure, and context.', tier: 2 },
      { q: 'How does the presentation of a theme differ between a text written in the 19th century and one written in the 20th century? Analyse the reasons for the difference.', tier: 3 },
    ],
  },
}

// ─── ECONOMICS ────────────────────────────────────────────────────────────────
const ECONOMICS = {
  'supply-demand': {
    label: 'Supply & Demand',
    subject: 'economics', band: 'GCSE Foundation', bandOrder: 1,
    prerequisites: [],
    nextSkills: ['market-failure', 'elasticity'],
    questions: [
      { q: 'What happens to the equilibrium price if demand for a good increases and supply stays the same?', tier: 1 },
      { q: 'Explain two factors that would cause the supply curve to shift to the right.', tier: 2 },
      { q: 'A government imposes a minimum price on wheat above the equilibrium. Using a diagram, explain the effect on the market.', tier: 3 },
    ],
  },

  'elasticity': {
    label: 'Elasticity',
    subject: 'economics', band: 'GCSE Higher', bandOrder: 3,
    prerequisites: ['supply-demand'],
    nextSkills: ['market-failure', 'firms-revenue'],
    questions: [
      { q: 'If price rises 10% and demand falls 5%, what is the PED? Is demand elastic or inelastic?', tier: 1 },
      { q: 'Explain why a firm selling an inelastic good can increase revenue by raising price.', tier: 2 },
      { q: 'Evaluate the factors that determine the price elasticity of demand for petrol.', tier: 3 },
    ],
  },

  'market-failure': {
    label: 'Market Failure',
    subject: 'economics', band: 'GCSE Higher', bandOrder: 4,
    prerequisites: ['supply-demand'],
    nextSkills: ['government-intervention'],
    questions: [
      { q: 'What is a negative externality? Give one example.', tier: 1 },
      { q: 'Explain why public goods like street lighting will be under-provided by the free market.', tier: 2 },
      { q: 'Using a diagram, show how a carbon tax could correct the market failure caused by pollution.', tier: 3 },
    ],
  },

  'macroeconomics': {
    label: 'Macroeconomic Objectives',
    subject: 'economics', band: 'GCSE Higher', bandOrder: 5,
    prerequisites: ['supply-demand'],
    nextSkills: ['fiscal-monetary'],
    questions: [
      { q: 'List four macroeconomic objectives a government might pursue.', tier: 1 },
      { q: 'Explain the conflict between reducing unemployment and controlling inflation.', tier: 2 },
      { q: 'Evaluate the view that economic growth is always desirable.', tier: 3 },
    ],
  },
}

// ─── COMPUTER SCIENCE ─────────────────────────────────────────────────────────
const COMPUTER_SCIENCE = {
  'variables-datatypes': {
    label: 'Variables & Data Types',
    subject: 'computer-science', band: 'GCSE Foundation', bandOrder: 1,
    prerequisites: [],
    nextSkills: ['selection-iteration', 'data-structures'],
    questions: [
      { q: 'What is the difference between an integer and a float? Give an example of each.', tier: 1 },
      { q: 'In Python, what is the output of: print(type(3.0)) and why?', tier: 2 },
      { q: 'A student uses a string to store a phone number. Explain why this might be more appropriate than an integer, and identify one operation that would fail if you tried it.', tier: 3 },
    ],
  },

  'selection-iteration': {
    label: 'Selection & Iteration',
    subject: 'computer-science', band: 'GCSE Foundation', bandOrder: 2,
    prerequisites: ['variables-datatypes'],
    nextSkills: ['subroutines', 'algorithms'],
    questions: [
      { q: 'Write pseudocode for a program that prints numbers 1 to 10 using a for loop.', tier: 1 },
      { q: 'What is the difference between a WHILE loop and a FOR loop? When would you use each?', tier: 2 },
      { q: 'A program uses a nested loop to print a 5×5 grid of *. What is the time complexity and how would you optimise it?', tier: 3 },
    ],
  },

  'subroutines': {
    label: 'Subroutines & Functions',
    subject: 'computer-science', band: 'GCSE Higher', bandOrder: 4,
    prerequisites: ['selection-iteration'],
    nextSkills: ['algorithms', 'oop'],
    questions: [
      { q: 'What is the difference between a function and a procedure?', tier: 1 },
      { q: 'Explain the benefits of using subroutines in a program. Give two reasons.', tier: 2 },
      { q: 'Explain the concept of variable scope. What is the risk of using only global variables?', tier: 3 },
    ],
  },

  'algorithms': {
    label: 'Algorithms & Searching',
    subject: 'computer-science', band: 'GCSE Higher', bandOrder: 5,
    prerequisites: ['subroutines'],
    nextSkills: ['sorting', 'complexity'],
    questions: [
      { q: 'Describe the steps of a binary search algorithm.', tier: 1 },
      { q: 'A list has 1024 elements. What is the maximum number of comparisons needed for a binary search?', tier: 2 },
      { q: 'Explain why binary search has O(log n) time complexity and when it cannot be used.', tier: 3 },
    ],
  },
}

// ─── MASTER MAP ───────────────────────────────────────────────────────────────
export const CALIBRATION_MAP = {
  maths: MATHS,
  physics: PHYSICS,
  chemistry: CHEMISTRY,
  biology: BIOLOGY,
  history: HISTORY,
  'english-lit': ENGLISH_LIT,
  economics: ECONOMICS,
  'computer-science': COMPUTER_SCIENCE,
}

// Entry node per subject — where the diagnostic starts
// Maths starts at algebra-intro (Grade 7-8): advances to GCSE if correct,
// retreats through primary chain if not — covers Grade 1 through A-Level
export const ENTRY_NODES = {
  maths:            'algebra-intro',
  physics:          'forces-basics',
  chemistry:        'atomic-structure-chem',
  biology:          'cell-structure',
  history:          'source-analysis',
  'english-lit':    'pee-structure',
  economics:        'supply-demand',
  'computer-science': 'variables-datatypes',
}

// Display labels for subjects
export const SUBJECT_LABELS = {
  maths:            'Maths',
  physics:          'Physics',
  chemistry:        'Chemistry',
  biology:          'Biology',
  history:          'History',
  'english-lit':    'English Lit',
  economics:        'Economics',
  'computer-science': 'Computer Science',
}

export const SUBJECT_ICONS = {
  maths:            '📐',
  physics:          '⚡',
  chemistry:        '🧪',
  biology:          '🧬',
  history:          '📜',
  'english-lit':    '📖',
  economics:        '📊',
  'computer-science': '💻',
}

/**
 * FAST_LANE — 2-question bracket that places a student at the right
 * entry point BEFORE the full diagnostic starts.
 *
 * Each bracket has:
 *   q        — the question text (injected directly, no API)
 *   label    — short label shown in the "Quick Check" badge
 *   nodeId   — the calibration node this bracket maps to (for skill reveal)
 *   onPass   — node ID to start full diagnostic from if solid/mastery
 *   onFail   — node ID to start from if none/partial (null = try next bracket)
 *
 * Maths ladder:
 *   Bracket 1 (Grade 7-8):  algebra + simple equation
 *     ✅ Pass → enter at linear-equations (GCSE)
 *     ❌ Fail → Bracket 2
 *   Bracket 2 (Grade 3-4):  times tables + simple division
 *     ✅ Pass → enter at fractions-equivalent (Grade 4-5)
 *     ❌ Fail → enter at addition-subtraction (Grade 1-2)
 */
export const FAST_LANE = {
  maths: [
    {
      label: 'Quick Check 1',
      q: 'Two quick checks — answer both:\n(a) If n = 5, find the value of 3n − 2.\n(b) Solve for x: 2x + 6 = 12',
      nodeId: 'algebra-intro',
      onPass: 'linear-equations',
      onFail: null,   // → try bracket 2
    },
    {
      label: 'Quick Check 2',
      q: 'Two more quick checks:\n(a) What is 7 × 8?\n(b) What is 48 ÷ 6?',
      nodeId: 'times-tables',
      onPass: 'fractions-equivalent',
      onFail: 'addition-subtraction',
    },
  ],
}

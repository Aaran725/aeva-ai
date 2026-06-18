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
// bandOrder scale: -6=Grade 1 → 0=Grade 7 → 1=Grade 8 → 4=Grade 10 → 8=AP Year 1 → 9=AP Year 2
const MATHS = {

  // ── PRIMARY (Grade 1–6 / Year 1–6) ─────────────────────────────────────────

  'counting-number': {
    label: 'Counting & Numbers',
    subject: 'maths', band: 'Grade 1', bandOrder: -6,
    prerequisites: [],
    nextSkills: ['addition-subtraction'],
    questions: [
      { q: 'What number comes after 19?', tier: 1 },
      { q: 'Count back from 50 in 5s. Write the first 6 numbers.', tier: 2 },
      { q: 'I have 3 bags. Each bag has 4 apples. How many apples altogether? Explain how you know.', tier: 3 },
    ],
  },

  'addition-subtraction': {
    label: 'Addition & Subtraction',
    subject: 'maths', band: 'Grade 2', bandOrder: -5,
    prerequisites: ['counting-number'],
    nextSkills: ['place-value', 'times-tables'],
    questions: [
      { q: 'What is 7 + 8?', tier: 1 },
      { q: 'A box has 24 crayons. 9 get lost. How many are left? Show your working.', tier: 2 },
      { q: 'True or false: 38 + 47 = 85. If false, what is the correct answer? Show how you worked it out.', tier: 3 },
    ],
  },

  'place-value': {
    label: 'Place Value',
    subject: 'maths', band: 'Grade 2', bandOrder: -5,
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
      { q: 'What is 7 × 8?', tier: 1 },
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
    label: 'Intro to Fractions',
    subject: 'maths', band: 'Grade 4', bandOrder: -3,
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
    subject: 'maths', band: 'Grade 5', bandOrder: -2,
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
    subject: 'maths', band: 'Grade 5', bandOrder: -2,
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
    subject: 'maths', band: 'Grade 6', bandOrder: -1,
    prerequisites: ['decimals-intro'],
    nextSkills: ['number-basics', 'basic-algebra'],
    questions: [
      { q: 'What is −3 + 7?', tier: 1 },
      { q: 'The temperature is −6°C at midnight and rises 11°C by noon. What is the temperature at noon?', tier: 2 },
      { q: 'Put these in order: −4, 2, −7, 0, −1, 5. Then find the sum of all six numbers.', tier: 3 },
    ],
  },

  'basic-area-perimeter': {
    label: 'Area & Perimeter',
    subject: 'maths', band: 'Grade 5', bandOrder: -2,
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
    subject: 'maths', band: 'Grade 6', bandOrder: -1,
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
    subject: 'maths', band: 'Grade 6', bandOrder: -1,
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
    subject: 'maths', band: 'Grade 7', bandOrder: 0,
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
    subject: 'maths', band: 'Grade 7', bandOrder: 0,
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
    subject: 'maths', band: 'Grade 8', bandOrder: 1,
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
    subject: 'maths', band: 'Grade 9', bandOrder: 2,
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
    subject: 'maths', band: 'Grade 9', bandOrder: 2,
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
    subject: 'maths', band: 'Grade 9+', bandOrder: 3,
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
    subject: 'maths', band: 'Grade 9+', bandOrder: 3,
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
    subject: 'maths', band: 'Grade 10', bandOrder: 4,
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
    subject: 'maths', band: 'Grade 10', bandOrder: 4,
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
    subject: 'maths', band: 'Grade 10+', bandOrder: 5,
    prerequisites: ['linear-equations'],
    nextSkills: ['quadratic-inequalities'],
    questions: [
      { q: 'Solve: 3x − 4 < 11 and show the solution on a number line.', tier: 1 },
      { q: 'Solve: 2x + 1 ≤ 3x − 5 and find the smallest integer that satisfies it.', tier: 2 },
      { q: 'Solve: |2x − 3| < 7. Give your answer as a compound inequality and show it on a number line.', tier: 3 },
    ],
  },

  'simultaneous-equations': {
    label: 'Simultaneous Equations',
    subject: 'maths', band: 'Grade 10+', bandOrder: 5,
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
    subject: 'maths', band: 'Grade 10+', bandOrder: 5,
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
    subject: 'maths', band: 'Grade 11', bandOrder: 6,
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
    subject: 'maths', band: 'Grade 11', bandOrder: 6,
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
    subject: 'maths', band: 'Grade 11+', bandOrder: 7,
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
    subject: 'maths', band: 'Grade 11', bandOrder: 6,
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
    subject: 'maths', band: 'Grade 10', bandOrder: 4,
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
    subject: 'maths', band: 'Grade 11', bandOrder: 6,
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
    subject: 'maths', band: 'Grade 11+', bandOrder: 7,
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
    subject: 'maths', band: 'Grade 11', bandOrder: 6,
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
    subject: 'maths', band: 'Grade 11+', bandOrder: 7,
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
    subject: 'maths', band: 'AP · Year 1', bandOrder: 8,
    prerequisites: ['discriminant', 'surds'],
    nextSkills: ['calculus-intro', 'binomial-expansion'],
    questions: [
      { q: 'Simplify: (x² − 9) / (x² + x − 6)', tier: 1 },
      { q: 'Express (3x + 1) / ((x+1)(x−2)) in partial fractions.', tier: 2 },
      { q: 'Prove that n² + n is always even for any integer n.', tier: 3 },
    ],
  },

  'calculus-intro': {
    label: 'Differentiation',
    subject: 'maths', band: 'AP · Year 1', bandOrder: 8,
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
    subject: 'maths', band: 'AP · Year 2', bandOrder: 9,
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
    subject: 'maths', band: 'AP · Year 2', bandOrder: 9,
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
    subject: 'maths', band: 'AP · Year 1', bandOrder: 8,
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
    subject: 'maths', band: 'AP · Year 1', bandOrder: 8,
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
    subject: 'maths', band: 'AP · Year 1', bandOrder: 8,
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
    subject: 'maths', band: 'AP · Year 1', bandOrder: 8,
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
    subject: 'maths', band: 'AP · Year 2', bandOrder: 9,
    prerequisites: ['trigonometry', 'trig-identities'],
    nextSkills: ['integration'],
    questions: [
      { q: 'Write sin(A + B) and cos(A + B) in expanded form.', tier: 1 },
      { q: 'Solve: 2sin²x − sinx − 1 = 0 for 0° ≤ x ≤ 360°.', tier: 2 },
      { q: 'Express 3sinx + 4cosx in the form Rsin(x + α), finding R and α. Hence find the maximum value and the x at which it occurs.', tier: 3 },
    ],
  },

  'quadratic-simultaneous': {
    label: 'Quadratic Simultaneous Equations',
    subject: 'maths', band: 'Grade 11', bandOrder: 6,
    prerequisites: ['simultaneous-equations', 'quadratic-factorising'],
    nextSkills: ['discriminant'],
    questions: [
      { q: 'Solve simultaneously: y = x + 1 and y = x²− 1', tier: 1 },
      { q: 'Solve simultaneously: x² + y² = 25 and y = 2x', tier: 2 },
      { q: 'Find the x-coordinates where y = x² − 3x and y = x + 5 intersect. Give exact answers.', tier: 3 },
    ],
  },

  'quadratic-inequalities': {
    label: 'Quadratic Inequalities',
    subject: 'maths', band: 'Grade 11', bandOrder: 6,
    prerequisites: ['inequalities', 'quadratic-factorising'],
    nextSkills: ['further-algebra'],
    questions: [
      { q: 'Solve: x² − 5x + 6 > 0', tier: 1 },
      { q: 'Solve: 2x² + x − 3 ≤ 0', tier: 2 },
      { q: 'Find the range of values of x for which x² < 3x + 10. Give your answer using inequality notation.', tier: 3 },
    ],
  },

  'transformations': {
    label: 'Graph Transformations',
    subject: 'maths', band: 'Grade 10+', bandOrder: 5,
    prerequisites: ['straight-line-graphs', 'quadratic-graphs'],
    nextSkills: ['trigonometry', 'further-trig'],
    questions: [
      { q: 'The graph of y = f(x) is translated 3 units right. Write the new equation.', tier: 1 },
      { q: 'Describe the transformation that maps y = x² to y = −(x + 2)²', tier: 2 },
      { q: 'The graph of y = sin(x) is stretched vertically by factor 3 and translated π/2 left. Write the equation of the new graph.', tier: 3 },
    ],
  },

  'calculus-applications': {
    label: 'Calculus Applications',
    subject: 'maths', band: 'AP · Year 2', bandOrder: 9,
    prerequisites: ['calculus-intro', 'integration'],
    nextSkills: [],
    questions: [
      { q: 'A particle moves with displacement s = t³ − 6t² + 9t. Find its velocity at t = 2.', tier: 1 },
      { q: 'Find the minimum value of f(x) = x³ − 3x² + 4 and verify it is a minimum.', tier: 2 },
      { q: 'A rectangle has perimeter 20 cm. Use calculus to find the dimensions that maximise the area.', tier: 3 },
    ],
  },

  'parametric': {
    label: 'Parametric Equations',
    subject: 'maths', band: 'AP · Year 2', bandOrder: 9,
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

  // ── PRIMARY (Grade 3–6 / Year 3–6) ─────────────────────────────────────────

  'pushes-pulls': {
    label: 'Pushes, Pulls & Friction',
    subject: 'physics', band: 'Grade 3', bandOrder: -4,
    prerequisites: [],
    nextSkills: ['forces-motion-primary'],
    questions: [
      { q: 'What is the difference between a push and a pull? Give one everyday example of each.', tier: 1 },
      { q: 'A ball rolls across a carpet and slows down. What force is acting on it, and what causes this force?', tier: 2 },
      { q: 'Explain why a football slows down on grass but would travel much further on a smooth icy surface. Name the force responsible.', tier: 3 },
      { q: 'A book rests on a table without moving. Name the two forces acting on it and explain why they must be equal in size.', tier: 4 },
    ],
  },

  'forces-motion-primary': {
    label: 'Speed, Motion & Simple Forces',
    subject: 'physics', band: 'Grade 5', bandOrder: -2,
    prerequisites: ['pushes-pulls'],
    nextSkills: ['forces-basics'],
    questions: [
      { q: 'A car travels 60 km in 2 hours. What is its average speed in km/h?', tier: 1 },
      { q: 'Explain why a skydiver eventually stops accelerating and falls at a constant speed. What is this called?', tier: 2 },
      { q: 'A cyclist travels 150 m in 30 seconds. Calculate their speed. Then describe one force that acts against their motion and explain its effect.', tier: 3 },
      { q: 'Explain the difference between speed and velocity. Give a real-life example where something has constant speed but changing velocity.', tier: 4 },
    ],
  },

  'forces-basics': {
    label: 'Forces & Newton\'s Laws',
    subject: 'physics', band: 'Grade 9', bandOrder: 2,
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
    subject: 'physics', band: 'Grade 9+', bandOrder: 3,
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
    subject: 'physics', band: 'Grade 10', bandOrder: 4,
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
    subject: 'physics', band: 'Grade 9+', bandOrder: 3,
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
    subject: 'physics', band: 'Grade 9+', bandOrder: 3,
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
    subject: 'physics', band: 'Grade 10+', bandOrder: 5,
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
    subject: 'physics', band: 'Grade 10+', bandOrder: 5,
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
    subject: 'physics', band: 'Grade 11+', bandOrder: 7,
    prerequisites: ['momentum', 'forces-basics'],
    nextSkills: ['simple-harmonic', 'gravitation'],
    questions: [
      { q: 'A 0.5 kg mass moves in a circle of radius 0.8 m at 4 m/s. Find the centripetal force.', tier: 1 },
      { q: 'A car travels over a hill of radius 50 m at 20 m/s. Find the normal reaction force if the car\'s mass is 800 kg.', tier: 2 },
      { q: 'A satellite orbits at height h above Earth. Derive an expression for its orbital speed in terms of g at that height and h.', tier: 3 },
    ],
  },

  'simple-harmonic': {
    label: 'Simple Harmonic Motion',
    subject: 'physics', band: 'AP · Year 1', bandOrder: 8,
    prerequisites: ['circular-motion'],
    nextSkills: ['gravitation'],
    questions: [
      { q: 'A mass on a spring oscillates with a period of 2 s. What is the frequency? If the amplitude is 0.1 m, what is the maximum speed?', tier: 1 },
      { q: 'A pendulum has length 0.25 m. Find its period. (g = 9.8 m/s²)', tier: 2 },
      { q: 'Show that x = A cos(ωt) satisfies the SHM equation a = −ω²x. State what each symbol represents.', tier: 3 },
    ],
  },

  'optics': {
    label: 'Optics & Light',
    subject: 'physics', band: 'Grade 10', bandOrder: 4,
    prerequisites: ['waves'],
    nextSkills: ['quantum'],
    questions: [
      { q: 'State Snell\'s Law and explain what happens to light when it crosses from air into glass.', tier: 1 },
      { q: 'A ray of light hits a glass block (n = 1.5) at 30° to the normal. Find the angle of refraction.', tier: 2 },
      { q: 'Explain total internal reflection and state the condition required. Give one practical application.', tier: 3 },
    ],
  },

  'quantum': {
    label: 'Quantum Physics',
    subject: 'physics', band: 'Grade 11+', bandOrder: 7,
    prerequisites: ['waves', 'atomic-structure'],
    nextSkills: [],
    questions: [
      { q: 'State what the photoelectric effect demonstrates about the nature of light.', tier: 1 },
      { q: 'Calculate the energy of a photon of frequency 5×10¹⁴ Hz. (h = 6.63×10⁻³⁴ J s)', tier: 2 },
      { q: 'Explain why increasing the intensity of light below the threshold frequency never causes photoelectric emission, no matter how long you wait.', tier: 3 },
    ],
  },

  'nuclear': {
    label: 'Nuclear Physics',
    subject: 'physics', band: 'Grade 11+', bandOrder: 7,
    prerequisites: ['atomic-structure'],
    nextSkills: [],
    questions: [
      { q: 'Write a balanced nuclear equation for alpha decay of uranium-238 (₉₂²³⁸U).', tier: 1 },
      { q: 'Calculate the binding energy per nucleon for helium-4, given mass defect of 0.030377 u. (1 u = 931.5 MeV)', tier: 2 },
      { q: 'Explain why nuclear fission of uranium releases energy but nuclear fusion of hydrogen also releases energy, when both involve rearranging nucleons.', tier: 3 },
    ],
  },

  'ac-dc': {
    label: 'AC & DC Electricity',
    subject: 'physics', band: 'Grade 10+', bandOrder: 5,
    prerequisites: ['electricity-basics', 'electromagnetism'],
    nextSkills: [],
    questions: [
      { q: 'What is the difference between AC and DC? Give one example of each.', tier: 1 },
      { q: 'An AC supply has peak voltage 325 V. Calculate the RMS voltage.', tier: 2 },
      { q: 'Explain why the UK mains supply uses AC at 50 Hz rather than DC, referring to the role of transformers.', tier: 3 },
    ],
  },

  'gravitation': {
    label: 'Gravitation',
    subject: 'physics', band: 'AP · Year 1', bandOrder: 8,
    prerequisites: ['circular-motion'],
    nextSkills: [],
    questions: [
      { q: 'Two masses of 5 kg and 8 kg are 0.4 m apart. Find the gravitational force between them. (G = 6.67×10⁻¹¹ N m² kg⁻²)', tier: 1 },
      { q: 'A satellite orbits Earth at radius 7×10⁶ m. Find its orbital period. (M_Earth = 6×10²⁴ kg, G = 6.67×10⁻¹¹)', tier: 2 },
      { q: 'Derive the escape velocity from Earth\'s surface from energy conservation principles.', tier: 3 },
    ],
  },
}

// ─── CHEMISTRY ────────────────────────────────────────────────────────────────
const CHEMISTRY = {

  // ── PRIMARY ─────────────────────────────────────────────────────────────────

  'materials-properties': {
    label: 'Materials & Their Properties',
    subject: 'chemistry', band: 'Grade 3', bandOrder: -4,
    prerequisites: [],
    nextSkills: ['changes-matter'],
    questions: [
      { q: 'Name one property that makes metal a good material for saucepans and one property that makes plastic good for bottles.', tier: 1 },
      { q: 'Why is wood used to make furniture but metal used for saucepans? Think about the properties of each material.', tier: 2 },
      { q: 'A student tests five materials to see which conducts electricity best. Predict the result for rubber, copper, and wood. Explain why for each.', tier: 3 },
      { q: 'Explain why the same substance (water) can exist as a solid, liquid, or gas. What changes between the states at a particle level?', tier: 4 },
    ],
  },

  'changes-matter': {
    label: 'Changing States & Simple Reactions',
    subject: 'chemistry', band: 'Grade 5', bandOrder: -2,
    prerequisites: ['materials-properties'],
    nextSkills: ['atomic-structure-chem'],
    questions: [
      { q: 'What happens to water when it is heated to 100°C? What is this change called?', tier: 1 },
      { q: 'Explain the difference between melting and dissolving. Give one everyday example of each.', tier: 2 },
      { q: 'Is burning paper a reversible or irreversible change? Explain how you know. Give one other example of an irreversible change.', tier: 3 },
      { q: 'Explain what happens to water particles when water freezes. Why does this explain why ice floats on liquid water?', tier: 4 },
    ],
  },

  'atomic-structure-chem': {
    label: 'Atomic Structure',
    subject: 'chemistry', band: 'Grade 8', bandOrder: 1,
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
    subject: 'chemistry', band: 'Grade 9', bandOrder: 2,
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
    subject: 'chemistry', band: 'Grade 9+', bandOrder: 3,
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
    subject: 'chemistry', band: 'Grade 10', bandOrder: 4,
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
    subject: 'chemistry', band: 'Grade 10', bandOrder: 4,
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
    subject: 'chemistry', band: 'Grade 10+', bandOrder: 5,
    prerequisites: ['reactions'],
    nextSkills: ['equilibrium'],
    questions: [
      { q: 'List four factors that affect the rate of a chemical reaction.', tier: 1 },
      { q: 'Explain how a catalyst increases the rate of reaction without being used up.', tier: 2 },
      { q: 'Marble chips react with HCl. Explain why the rate is faster with powder than chips of the same mass.', tier: 3 },
    ],
  },

  'structure-properties': {
    label: 'Structure & Properties',
    subject: 'chemistry', band: 'Grade 10', bandOrder: 4,
    prerequisites: ['bonding'],
    nextSkills: ['rates'],
    questions: [
      { q: 'Why do giant ionic lattices have high melting points but dissolve in water?', tier: 1 },
      { q: 'Compare the electrical conductivity of ionic compounds when solid vs dissolved. Explain using structure.', tier: 2 },
      { q: 'Explain why graphite conducts electricity but diamond does not, despite both being covalent carbon structures.', tier: 3 },
    ],
  },

  'concentration': {
    label: 'Concentration & Solutions',
    subject: 'chemistry', band: 'Grade 10', bandOrder: 4,
    prerequisites: ['moles'],
    nextSkills: ['reactions'],
    questions: [
      { q: 'Calculate the concentration in mol/dm³ of a solution made by dissolving 0.5 mol of NaCl in 250 cm³ of water.', tier: 1 },
      { q: '50 cm³ of 2 mol/dm³ HCl is diluted to 200 cm³. What is the new concentration?', tier: 2 },
      { q: 'A titration uses 24.5 cm³ of 0.1 mol/dm³ NaOH to neutralise 25 cm³ of H₂SO₄. Calculate the concentration of the acid.', tier: 3 },
    ],
  },

  'equilibrium': {
    label: 'Equilibrium & Le Chatelier',
    subject: 'chemistry', band: 'Grade 11+', bandOrder: 7,
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

  // ── PRIMARY ─────────────────────────────────────────────────────────────────

  'living-things': {
    label: 'Living Things & Life Processes',
    subject: 'biology', band: 'Grade 3', bandOrder: -4,
    prerequisites: [],
    nextSkills: ['body-health'],
    questions: [
      { q: 'Name three things that all living things need to survive.', tier: 1 },
      { q: 'What is the difference between a vertebrate and an invertebrate? Give one example of each.', tier: 2 },
      { q: 'Explain why plants are called producers and animals are called consumers. What would happen to all animals if every plant on Earth disappeared?', tier: 3 },
      { q: 'Explain why a cactus is well adapted to surviving in a desert. Name three features and explain how each one helps survival.', tier: 4 },
    ],
  },

  'body-health': {
    label: 'The Human Body & Health',
    subject: 'biology', band: 'Grade 5', bandOrder: -2,
    prerequisites: ['living-things'],
    nextSkills: ['cell-structure'],
    questions: [
      { q: 'Name the organ that pumps blood around the body. Name one substance blood carries to your muscles.', tier: 1 },
      { q: 'Explain what happens to your breathing rate and heart rate when you exercise, and why this happens.', tier: 2 },
      { q: 'Describe how food travels through your digestive system. Name at least three organs it passes through and describe what happens at each stage.', tier: 3 },
      { q: 'Explain the difference between aerobic and anaerobic respiration. When does your body switch between them, and what is the by-product of each?', tier: 4 },
    ],
  },

  'cell-structure': {
    label: 'Cell Structure',
    subject: 'biology', band: 'Grade 8', bandOrder: 1,
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
    subject: 'biology', band: 'Grade 9', bandOrder: 2,
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
    subject: 'biology', band: 'Grade 9+', bandOrder: 3,
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
    subject: 'biology', band: 'Grade 10+', bandOrder: 5,
    prerequisites: ['cell-structure'],
    nextSkills: ['evolution', 'genetic-engineering'],
    questions: [
      { q: 'What are the four bases in DNA? Which pairs with which?', tier: 1 },
      { q: 'Two heterozygous parents (Tt × Tt) have children. What is the probability of a child being tall (T dominant)? Use a Punnett square.', tier: 2 },
      { q: 'Cystic fibrosis is autosomal recessive. A carrier mother and unaffected father have four children — one has CF. Deduce the father\'s genotype.', tier: 3 },
    ],
  },

  'breathing': {
    label: 'Breathing & Gas Exchange',
    subject: 'biology', band: 'Grade 9', bandOrder: 2,
    prerequisites: ['cell-transport'],
    nextSkills: ['enzymes'],
    questions: [
      { q: 'What is the difference between breathing and respiration?', tier: 1 },
      { q: 'Explain how the alveoli are adapted for efficient gas exchange. Give three features.', tier: 2 },
      { q: 'Explain why oxygen moves from the alveoli into the blood and carbon dioxide moves in the opposite direction. Use the concept of concentration gradients.', tier: 3 },
    ],
  },

  'digestion': {
    label: 'Digestion & Nutrition',
    subject: 'biology', band: 'Grade 9+', bandOrder: 3,
    prerequisites: ['enzymes'],
    nextSkills: ['dna-genetics'],
    questions: [
      { q: 'Name the enzyme that breaks down starch and state where it is produced.', tier: 1 },
      { q: 'Explain the role of bile in digestion. Why is it not an enzyme?', tier: 2 },
      { q: 'Describe how the small intestine is adapted to maximise absorption of digested food. Give three structural features.', tier: 3 },
    ],
  },

  'genetic-engineering': {
    label: 'Genetic Engineering',
    subject: 'biology', band: 'Grade 11', bandOrder: 6,
    prerequisites: ['dna-genetics'],
    nextSkills: [],
    questions: [
      { q: 'What is genetic engineering? Give one example of a genetically engineered product.', tier: 1 },
      { q: 'Explain the role of restriction enzymes and ligase enzymes in genetic engineering.', tier: 2 },
      { q: 'Evaluate one benefit and one ethical concern of using genetic engineering to produce insulin.', tier: 3 },
    ],
  },

  'evolution': {
    label: 'Evolution & Natural Selection',
    subject: 'biology', band: 'Grade 10+', bandOrder: 5,
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
    subject: 'history', band: 'Grade 8', bandOrder: 1,
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
    subject: 'history', band: 'Grade 9', bandOrder: 2,
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
    subject: 'history', band: 'Grade 9+', bandOrder: 3,
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
    subject: 'history', band: 'Grade 10', bandOrder: 4,
    prerequisites: ['ww1-causes'],
    nextSkills: ['weimar', 'ww2-causes'],
    questions: [
      { q: 'Name two terms of the Treaty of Versailles that punished Germany.', tier: 1 },
      { q: 'Explain why many Germans felt the Treaty of Versailles was unfair.', tier: 2 },
      { q: 'Evaluate the extent to which the Treaty of Versailles caused the rise of Hitler.', tier: 3 },
    ],
  },

  'ww1-trench': {
    label: 'WW1 — Trench Warfare',
    subject: 'history', band: 'Grade 10', bandOrder: 4,
    prerequisites: ['ww1-causes'],
    nextSkills: ['versailles'],
    questions: [
      { q: 'Describe two features of life in the trenches during WW1.', tier: 1 },
      { q: 'Explain why the Western Front became a stalemate by late 1914.', tier: 2 },
      { q: '"New technology in WW1 favoured defence over attack." How far do you agree? Refer to at least two weapons or tactics.', tier: 3 },
    ],
  },

  'weimar': {
    label: 'Weimar Republic',
    subject: 'history', band: 'Grade 10+', bandOrder: 5,
    prerequisites: ['versailles'],
    nextSkills: ['ww2-causes'],
    questions: [
      { q: 'When was the Weimar Republic established, and what was Article 48?', tier: 1 },
      { q: 'Explain two problems the Weimar Republic faced in its early years (1919–1923).', tier: 2 },
      { q: 'How far was the hyperinflation crisis of 1923 responsible for the early weakness of the Weimar Republic?', tier: 3 },
    ],
  },

  'ww2-causes': {
    label: 'Causes of World War Two',
    subject: 'history', band: 'Grade 10+', bandOrder: 5,
    prerequisites: ['versailles', 'causation'],
    nextSkills: [],
    questions: [
      { q: 'Name two policies of appeasement used by Britain and France in the 1930s.', tier: 1 },
      { q: 'Explain how Hitler\'s foreign policy aims contributed to the outbreak of WW2.', tier: 2 },
      { q: '"Appeasement was the main cause of WW2." How far do you agree? Consider at least two other causes.', tier: 3 },
    ],
  },

  'significance': {
    label: 'Significance & Change',
    subject: 'history', band: 'Grade 9', bandOrder: 2,
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
    subject: 'english-lit', band: 'Grade 8', bandOrder: 1,
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
    subject: 'english-lit', band: 'Grade 9+', bandOrder: 3,
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
    subject: 'english-lit', band: 'Grade 9+', bandOrder: 3,
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
    subject: 'english-lit', band: 'Grade 10+', bandOrder: 5,
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
    subject: 'english-lit', band: 'Grade 11', bandOrder: 6,
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
    subject: 'economics', band: 'Grade 8', bandOrder: 1,
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
    subject: 'economics', band: 'Grade 9+', bandOrder: 3,
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
    subject: 'economics', band: 'Grade 10', bandOrder: 4,
    prerequisites: ['supply-demand'],
    nextSkills: ['government-intervention'],
    questions: [
      { q: 'What is a negative externality? Give one example.', tier: 1 },
      { q: 'Explain why public goods like street lighting will be under-provided by the free market.', tier: 2 },
      { q: 'Using a diagram, show how a carbon tax could correct the market failure caused by pollution.', tier: 3 },
    ],
  },

  'firms-revenue': {
    label: 'Firms, Costs & Revenue',
    subject: 'economics', band: 'Grade 10', bandOrder: 4,
    prerequisites: ['elasticity'],
    nextSkills: ['market-failure'],
    questions: [
      { q: 'What is the difference between fixed costs and variable costs? Give one example of each.', tier: 1 },
      { q: 'A firm sells 100 units at £5 each. Total costs are £400. Calculate profit.', tier: 2 },
      { q: 'Explain why a profit-maximising firm produces where MR = MC. What happens to profit if it produces one unit more?', tier: 3 },
    ],
  },

  'government-intervention': {
    label: 'Government Intervention',
    subject: 'economics', band: 'Grade 10+', bandOrder: 5,
    prerequisites: ['market-failure'],
    nextSkills: ['macroeconomics'],
    questions: [
      { q: 'Give two examples of government intervention to correct market failure.', tier: 1 },
      { q: 'Explain how a subsidy on electric cars could correct a positive externality.', tier: 2 },
      { q: 'Evaluate the effectiveness of a minimum wage as a government policy. Consider both benefits and drawbacks.', tier: 3 },
    ],
  },

  'fiscal-monetary': {
    label: 'Fiscal & Monetary Policy',
    subject: 'economics', band: 'Grade 11', bandOrder: 6,
    prerequisites: ['macroeconomics'],
    nextSkills: [],
    questions: [
      { q: 'What is the difference between fiscal policy and monetary policy?', tier: 1 },
      { q: 'Explain how raising interest rates could reduce inflation.', tier: 2 },
      { q: 'Evaluate whether cutting income tax is an effective way to reduce unemployment. Consider the trade-offs.', tier: 3 },
    ],
  },

  'macroeconomics': {
    label: 'Macroeconomic Objectives',
    subject: 'economics', band: 'Grade 10+', bandOrder: 5,
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

  // ── PRIMARY ─────────────────────────────────────────────────────────────────

  'what-is-computing': {
    label: 'What is Computing?',
    subject: 'computer-science', band: 'Grade 3', bandOrder: -4,
    prerequisites: [],
    nextSkills: ['algorithms-logic'],
    questions: [
      { q: 'What is an algorithm? Give one everyday example (not a computer program).', tier: 1 },
      { q: 'Write step-by-step instructions for making a jam sandwich. Why does the order of steps matter in an algorithm?', tier: 2 },
      { q: 'Explain the difference between hardware and software. Give one example of each and explain how they work together.', tier: 3 },
      { q: 'Your instructions for making toast don\'t mention plugging in the toaster. What kind of error is this, and why can computers not fix errors like this themselves?', tier: 4 },
    ],
  },

  'algorithms-logic': {
    label: 'Algorithms & Logical Thinking',
    subject: 'computer-science', band: 'Grade 5', bandOrder: -2,
    prerequisites: ['what-is-computing'],
    nextSkills: ['variables-datatypes'],
    questions: [
      { q: 'What is a sequence in programming? Give a simple 2–3 step example.', tier: 1 },
      { q: 'Look at this algorithm: Start with n = 10. While n > 0: print n, then subtract 3. What will it print? Will it ever stop?', tier: 2 },
      { q: 'Explain what a bug is in a program. Describe one strategy you would use to find and fix a bug in code that is producing the wrong output.', tier: 3 },
      { q: 'Explain the difference between a selection (if/else) and a loop (while/for). Write pseudocode that uses both to print "even" or "odd" for each number from 1 to 10.', tier: 4 },
    ],
  },

  'variables-datatypes': {
    label: 'Variables & Data Types',
    subject: 'computer-science', band: 'Grade 8', bandOrder: 1,
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
    subject: 'computer-science', band: 'Grade 9', bandOrder: 2,
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
    subject: 'computer-science', band: 'Grade 10', bandOrder: 4,
    prerequisites: ['selection-iteration'],
    nextSkills: ['algorithms', 'oop'],
    questions: [
      { q: 'What is the difference between a function and a procedure?', tier: 1 },
      { q: 'Explain the benefits of using subroutines in a program. Give two reasons.', tier: 2 },
      { q: 'Explain the concept of variable scope. What is the risk of using only global variables?', tier: 3 },
    ],
  },

  'data-structures': {
    label: 'Data Structures',
    subject: 'computer-science', band: 'Grade 9', bandOrder: 2,
    prerequisites: ['variables-datatypes'],
    nextSkills: ['algorithms'],
    questions: [
      { q: 'What is the difference between a list (array) and a dictionary (hash map)?', tier: 1 },
      { q: 'Explain the difference between a stack and a queue. Give one real-world example of each.', tier: 2 },
      { q: 'Describe how a linked list differs from an array in terms of memory and access time. When would you prefer each?', tier: 3 },
    ],
  },

  'oop': {
    label: 'Object-Oriented Programming',
    subject: 'computer-science', band: 'Grade 10+', bandOrder: 5,
    prerequisites: ['subroutines'],
    nextSkills: ['algorithms'],
    questions: [
      { q: 'What is a class? What is an object? Give a real-world example of each.', tier: 1 },
      { q: 'Explain the concepts of encapsulation and inheritance using a concrete example.', tier: 2 },
      { q: 'What is polymorphism? Write pseudocode to show how two subclasses can override the same method differently.', tier: 3 },
    ],
  },

  'sorting': {
    label: 'Sorting Algorithms',
    subject: 'computer-science', band: 'Grade 11', bandOrder: 6,
    prerequisites: ['algorithms'],
    nextSkills: ['complexity'],
    questions: [
      { q: 'Describe the steps of bubble sort on this list: [5, 3, 8, 1, 9]', tier: 1 },
      { q: 'Compare bubble sort and merge sort in terms of time complexity. When does the difference matter?', tier: 2 },
      { q: 'Explain why merge sort has O(n log n) complexity while bubble sort is O(n²). Trace through a small example.', tier: 3 },
    ],
  },

  'complexity': {
    label: 'Computational Complexity',
    subject: 'computer-science', band: 'Grade 11+', bandOrder: 7,
    prerequisites: ['algorithms', 'sorting'],
    nextSkills: [],
    questions: [
      { q: 'What does O(n) mean? What does O(n²) mean? Give an algorithm example of each.', tier: 1 },
      { q: 'An algorithm takes 1 second for n=10 and 100 seconds for n=100. What is its likely complexity?', tier: 2 },
      { q: 'Explain the difference between time complexity and space complexity. Give an algorithm where they trade off against each other.', tier: 3 },
    ],
  },

  'algorithms': {
    label: 'Algorithms & Searching',
    subject: 'computer-science', band: 'Grade 10+', bandOrder: 5,
    prerequisites: ['subroutines'],
    nextSkills: ['sorting', 'complexity'],
    questions: [
      { q: 'Describe the steps of a binary search algorithm.', tier: 1 },
      { q: 'A list has 1024 elements. What is the maximum number of comparisons needed for a binary search?', tier: 2 },
      { q: 'Explain why binary search has O(log n) time complexity and when it cannot be used.', tier: 3 },
    ],
  },
}

// ─── READING ───────────────────────────────────────────────────────────────────
// bandOrder scale matches maths: -6=Grade 1 → 0=Grade 7 → 4=Grade 10 → 8=AP Year 1 → 9=AP Year 2
// All questions embed any needed passage directly in the question text.
// Rubric critic is used (like History / English Lit) — answers are interpretive.
const READING = {

  // ── FOUNDATIONS (Grade 1–2) ───────────────────────────────────────────────

  'phonics-decoding': {
    label: 'Phonics & Decoding',
    subject: 'reading', band: 'Grade 1', bandOrder: -6,
    prerequisites: [],
    nextSkills: ['sight-words-fluency', 'basic-sentence-comp'],
    questions: [
      { q: 'Read this word: "chin". Which letters make the "ch" sound?\n(a) c and h together  (b) just the c  (c) just the h  (d) i and n together', tier: 1 },
      { q: 'Which word has the SAME vowel sound as "cloud"?\n(a) cold  (b) clown  (c) clue  (d) club', tier: 2 },
      { q: 'Which TWO words have a SILENT letter?\n(a) knee  (b) ship  (c) write  (d) flat', tier: 3 },
    ],
  },

  'sight-words-fluency': {
    label: 'Sight Words & Fluency',
    subject: 'reading', band: 'Grade 1', bandOrder: -6,
    prerequisites: ['phonics-decoding'],
    nextSkills: ['basic-sentence-comp'],
    questions: [
      { q: 'Read this: "The big brown dog ran fast down the street. It stopped at a tree and barked loudly." What did the dog do FIRST?\n(a) barked loudly  (b) stopped at a tree  (c) ran fast down the street  (d) sat down', tier: 1 },
      { q: 'Read this: "Sam woke up early. She ate breakfast quickly. Then she ran to catch the bus before it left." What did Sam do LAST?\n(a) woke up  (b) ate breakfast  (c) ran to catch the bus  (d) got dressed', tier: 2 },
      { q: 'Read this: "Every morning, Luis fed his fish before school. One day he forgot. When he came home, the fish swam in circles near the top of the tank." Select TWO statements that are TRUE about this story.\n(a) Luis forgot to feed his fish that morning  (b) Luis fed his fish twice that day  (c) the fish may be hungry  (d) the fish was sleeping', tier: 3 },
    ],
  },

  'basic-sentence-comp': {
    label: 'Basic Sentence Comprehension',
    subject: 'reading', band: 'Grade 2', bandOrder: -5,
    prerequisites: ['sight-words-fluency'],
    nextSkills: ['main-idea-details', 'sequence-retell'],
    questions: [
      { q: 'Read this: "The sleepy kitten curled up on the warm, soft blanket." Which TWO things do we learn from this sentence?\n(a) the kitten is sleepy  (b) the kitten is hungry  (c) the blanket is warm and soft  (d) the kitten is playing', tier: 1 },
      { q: 'Read this: "Maria wanted a dog for her birthday. Instead, she got a book about dogs." How does Maria most likely feel?\n(a) happy and excited  (b) disappointed but still interested in dogs  (c) angry and confused  (d) grateful and relieved', tier: 2 },
      { q: 'Read this: "The tiny seed pushed through the dark soil. First came a thin green shoot, then two leaves, and finally a bright yellow flower." Select TWO statements that are TRUE.\n(a) the shoot appeared before the flower  (b) the flower appeared first  (c) the seed grew into a plant  (d) the leaves appeared after the flower', tier: 3 },
    ],
  },

  // ── PRIMARY COMPREHENSION (Grade 3–4) ─────────────────────────────────────

  'main-idea-details': {
    label: 'Main Idea & Supporting Details',
    subject: 'reading', band: 'Grade 3', bandOrder: -4,
    prerequisites: ['basic-sentence-comp'],
    nextSkills: ['sequence-retell', 'context-clues-basic', 'grammar-mechanics'],
    questions: [
      { q: 'Read this: "Dolphins are very intelligent animals. They can learn tricks and follow instructions. Dolphins also communicate using clicks and whistles. Scientists believe dolphins even have their own names." What is the MAIN IDEA of this passage?\n(a) Dolphins make good pets  (b) Dolphins are very intelligent animals  (c) Dolphins live in the ocean  (d) Scientists study dolphins', tier: 1 },
      { q: 'Read this: "In autumn, many trees lose their leaves. Shorter days mean less sunlight, so trees cannot make enough food. They drop their leaves to save energy for winter. In spring, when sunlight returns, new leaves grow." Select TWO details that SUPPORT the main idea.\n(a) trees drop their leaves because they cannot make enough food  (b) trees are colourful in autumn  (c) trees save energy for winter by losing leaves  (d) all plants behave the same way in autumn', tier: 2 },
      { q: 'Read this: "Ada Lovelace is often called the world\'s first computer programmer. She worked with Charles Babbage in the 1800s on his Analytical Engine. Lovelace wrote an algorithm for this machine — making her a pioneer of computing over 100 years before modern computers." Which TWO details BEST support the claim that Ada Lovelace was a pioneer of computing?\n(a) she wrote an algorithm for the Analytical Engine  (b) she worked alongside Charles Babbage  (c) she did this over 100 years before modern computers existed  (d) Babbage designed the Analytical Engine', tier: 3 },
    ],
  },

  'sequence-retell': {
    label: 'Sequence & Retelling',
    subject: 'reading', band: 'Grade 3', bandOrder: -4,
    prerequisites: ['basic-sentence-comp'],
    nextSkills: ['context-clues-basic', 'narrative-structure'],
    questions: [
      { q: 'Read this: "First, Mia mixed flour and butter. Next, she added sugar and eggs. Then she poured the batter into a tin. Finally, she put it in the oven." What did Mia do SECOND?\n(a) mixed flour and butter  (b) added sugar and eggs  (c) poured the batter into a tin  (d) put the tin in the oven', tier: 1 },
      { q: 'Read this: "Olu found a lost puppy in the rain. He dried it off and gave it water. He made posters and put them around the neighbourhood. Two days later, a woman called and said the puppy was hers." Which sentence BEST retells this story?\n(a) Olu kept a puppy he found and never found its owner  (b) Olu found a puppy, cared for it, and helped return it to its owner  (c) A woman lost her dog and put up posters around the neighbourhood  (d) Olu found a puppy and immediately called its owner', tier: 2 },
      { q: 'Read this: "The caterpillar ate for several weeks, growing fat. Then it formed a hard shell called a chrysalis. Inside, its body completely changed. Two weeks later, a butterfly pushed its way out, dried its wings, and flew away." Select TWO statements that are TRUE about the chrysalis stage.\n(a) it is where the caterpillar\'s body transforms into a butterfly  (b) it is a stage the caterpillar skips if it grows quickly  (c) without the chrysalis, there would be no butterfly  (d) the chrysalis is just a resting place and nothing changes inside it', tier: 3 },
    ],
  },

  'context-clues-basic': {
    label: 'Context Clues',
    subject: 'reading', band: 'Grade 4', bandOrder: -3,
    prerequisites: ['main-idea-details'],
    nextSkills: ['vocabulary-in-context', 'grammar-mechanics'],
    questions: [
      { q: 'Read this: "The enormous elephant was so large it knocked down a small tree just by walking past." What does "enormous" most likely mean?\n(a) very fast  (b) very large  (c) very loud  (d) very heavy', tier: 1 },
      { q: 'Read this: "Zara was famished after the long hike. She hadn\'t eaten since breakfast, and her stomach growled loudly as she smelled the soup." Select TWO clues that help you understand what "famished" means.\n(a) she hadn\'t eaten since breakfast  (b) she went on a long hike  (c) her stomach growled  (d) she smelled the soup', tier: 2 },
      { q: 'Read this: "The explorer navigated through the dense, impenetrable jungle — the trees grew so close together that sunlight barely reached the ground." Select TWO context clues that BEST help you understand what "impenetrable" means.\n(a) the trees grew so close together that sunlight barely reached the ground  (b) the explorer was navigating through the jungle  (c) the word "dense" appears just before it  (d) the jungle is described as somewhere an explorer visits', tier: 3 },
    ],
  },

  'grammar-mechanics': {
    label: 'Grammar & Sentence Structure',
    subject: 'reading', band: 'Grade 4', bandOrder: -3,
    prerequisites: ['basic-sentence-comp'],
    nextSkills: ['vocabulary-in-context', 'text-structure'],
    questions: [
      { q: 'Read this: "Running quickly, the girl caught the bus just in time." What does the phrase "Running quickly" tell us about the girl?\n(a) what she is wearing  (b) how she was moving  (c) where she was going  (d) who she is', tier: 1 },
      { q: 'Read these two sentences: "The dog barked. The mailman arrived." If you want to show that the dog barked BECAUSE the mailman arrived, which combined sentence is BEST?\n(a) The dog barked and the mailman arrived  (b) The dog barked because the mailman arrived  (c) The dog barked although the mailman arrived  (d) The dog barked but the mailman arrived', tier: 2 },
      { q: 'Read this: "The players, soaked through but determined, pressed on." Select TWO things that would be LOST if you removed the phrase "soaked through but determined".\n(a) we would not know how the players felt  (b) we would not know the players pressed on  (c) we would lose information about the players\' physical condition  (d) the sentence would have no subject', tier: 3 },
    ],
  },

  // ── VOCABULARY & STRATEGIES (Grade 5–6) ───────────────────────────────────

  'vocabulary-in-context': {
    label: 'Vocabulary in Context',
    subject: 'reading', band: 'Grade 5', bandOrder: -2,
    prerequisites: ['context-clues-basic'],
    nextSkills: ['authors-purpose', 'inference-basic', 'nonfiction-features'],
    questions: [
      { q: 'Read this: "The hiker was exhausted after the long trek up the steep mountain path." What does "exhausted" most likely mean?\n(a) very tired  (b) very hungry  (c) very lost  (d) very cold', tier: 1 },
      { q: 'Read this: "The politician\'s speech was eloquent — every word carefully chosen, the rhythm flowing, the argument building steadily to a powerful conclusion." What does "eloquent" most likely mean?\n(a) very short and direct  (b) well-spoken and skilfully expressed  (c) loud and forceful  (d) confusing and hard to follow', tier: 2 },
      { q: 'Read this: "After years of obscurity, the painter\'s work finally gained recognition — her canvases began appearing in galleries, critics wrote glowing reviews, and collectors competed to own her pieces." Select TWO clues that help you understand what "obscurity" means.\n(a) her work "finally gained recognition" — implying she didn\'t have it before  (b) critics wrote glowing reviews of her work  (c) the contrast between "years of obscurity" and the recognition that followed  (d) collectors competed to own her pieces', tier: 3 },
    ],
  },

  'authors-purpose': {
    label: "Author's Purpose",
    subject: 'reading', band: 'Grade 5', bandOrder: -2,
    prerequisites: ['main-idea-details'],
    nextSkills: ['inference-basic', 'text-structure', 'argument-structure'],
    questions: [
      { q: 'Read this: "Littering is destroying our parks. Every year, tonnes of rubbish are left behind. We all have a responsibility to keep public spaces clean." What is the author\'s MAIN purpose?\n(a) to entertain readers with a funny story  (b) to inform readers about different types of litter  (c) to persuade readers to change their behaviour  (d) to describe what parks look like', tier: 1 },
      { q: 'Read this: "The deep ocean is the least explored place on Earth. More than 80% has never been mapped. Strange creatures live in total darkness miles below the surface — some produce their own light, others have jaws that can swallow prey larger than themselves." Select TWO techniques the author uses to achieve their purpose.\n(a) surprising statistics such as "more than 80% has never been mapped"  (b) a personal anecdote about visiting the ocean  (c) vivid descriptions of strange deep-sea creatures  (d) an argument against ocean exploration', tier: 2 },
      { q: 'Read this: "Fresh air is free. Gym memberships are not. Every morning, thousands of people drive to a building to walk on a machine — inside — while the sun shines and the park sits empty outside." Select TWO techniques used in this passage.\n(a) contrast between free outdoor exercise and expensive indoor exercise  (b) statistics about gym membership costs  (c) irony — describing the absurdity of driving to a gym when parks exist outside  (d) a personal story about someone who chose the gym over the park', tier: 3 },
    ],
  },

  'nonfiction-features': {
    label: 'Nonfiction Text Features',
    subject: 'reading', band: 'Grade 5', bandOrder: -2,
    prerequisites: ['main-idea-details'],
    nextSkills: ['text-structure', 'compare-contrast-texts'],
    questions: [
      { q: 'A nonfiction book has a table of contents and a glossary. What is the PURPOSE of a glossary?\n(a) to list the chapters in order  (b) to explain difficult or technical words used in the book  (c) to list topics alphabetically for quick reference  (d) to summarise each chapter', tier: 1 },
      { q: 'A science article includes a bar chart showing annual rainfall in five cities, with the caption: "London receives less rain than Seattle, despite its reputation." Select TWO reasons why the author might include this chart.\n(a) to give visual evidence that supports the written claim  (b) to replace the need for any written text  (c) to show data that is easier to compare visually than in words  (d) to make the article look more professional', tier: 2 },
      { q: 'A journalist and an academic textbook cover the same topic. Select TWO ways their use of text features would DIFFER.\n(a) the journalist uses pull-quotes and headings to grab attention; the textbook uses them to organise dense content  (b) both use identical formatting since the information is the same  (c) the journalist assumes a general reader; the textbook assumes a specialist audience  (d) textbooks never use headings; only journalists use them', tier: 3 },
    ],
  },

  'inference-basic': {
    label: 'Making Inferences',
    subject: 'reading', band: 'Grade 6', bandOrder: -1,
    prerequisites: ['vocabulary-in-context', 'authors-purpose'],
    nextSkills: ['character-analysis', 'theme-identification', 'inference-advanced'],
    questions: [
      { q: 'Read this: "Jake walked into the exam hall, sat down, and immediately turned the paper over. He stared at the first question, put his pen down, and rubbed his eyes." How is Jake most likely feeling?\n(a) excited and confident  (b) nervous or anxious  (c) bored and uninterested  (d) happy and relaxed', tier: 1 },
      { q: 'Read this: "Nadia put on her coat and called out \'Goodbye!\' No one answered. She stood in the hallway for a moment, then quietly closed the door behind her." Select TWO inferences that are supported by this passage.\n(a) Nadia lives alone or no one was home  (b) Nadia is leaving in a hurry  (c) there is no one to say goodbye to  (d) Nadia is going somewhere she is excited about', tier: 2 },
      { q: 'Read this: "The old man set two cups on the table every morning. He filled one with tea and left the other empty. He never moved the empty cup." Select TWO inferences that BEST explain this behaviour.\n(a) the old man is forgetful and keeps setting an extra cup by mistake  (b) the empty cup represents someone who used to sit with him  (c) this habit suggests loneliness or grief for someone no longer there  (d) the old man simply prefers two cups on the table', tier: 3 },
    ],
  },

  'text-structure': {
    label: 'Text Structure',
    subject: 'reading', band: 'Grade 6', bandOrder: -1,
    prerequisites: ['authors-purpose', 'sequence-retell'],
    nextSkills: ['character-analysis', 'inference-advanced', 'text-structure-analysis'],
    questions: [
      { q: 'Read this: "Dogs and cats make popular pets. Dogs need daily walks and enjoy company, while cats are more independent. Both animals, however, need food, water, and regular vet visits." What text structure is this?\n(a) cause and effect  (b) compare and contrast  (c) problem and solution  (d) chronological', tier: 1 },
      { q: 'Read this: "Rising sea levels threaten coastal cities. As ice caps melt due to warming temperatures, water levels rise and storm surges reach further inland. Engineers are designing higher sea walls and flood barriers to protect low-lying areas." What is the text structure of this passage?\n(a) compare and contrast  (b) chronological order  (c) problem and solution  (d) descriptive', tier: 2 },
      { q: 'Read this: "Before the internet, people wrote letters. Writing a letter forced careful thought — you couldn\'t unsend it. Today, a message takes seconds. Yet studies show handwritten letters are remembered more fondly by recipients." Select TWO reasons why the author chose to structure this passage as a contrast between past and present.\n(a) to highlight how the speed of communication has changed  (b) to prove that letters are always superior to messages  (c) to suggest that slower, more deliberate communication has lasting value  (d) to provide a timeline of how postal services developed', tier: 3 },
    ],
  },

  // ── LITERARY ELEMENTS (Grade 7–8) ─────────────────────────────────────────

  'character-analysis': {
    label: 'Character Analysis',
    subject: 'reading', band: 'Grade 7', bandOrder: 0,
    prerequisites: ['inference-basic'],
    nextSkills: ['theme-identification', 'narrative-structure', 'point-of-view'],
    questions: [
      { q: 'Read this: "Mr. Greer never smiled. He marked every assignment with red pen and handed it back without a word. Yet on the last day of school, he left a folded note on each student\'s desk." Which description BEST fits Mr. Greer?\n(a) cruel and uncaring  (b) strict on the outside but quietly caring  (c) lazy and disorganised  (d) friendly and warm throughout', tier: 1 },
      { q: 'Read this: "Elena had always been the best in class — the first to raise her hand, the last to leave the library. But when she saw the exam paper, she went pale. She had studied the wrong chapters." Select TWO things this passage reveals about Elena.\n(a) she is usually hardworking and high-achieving  (b) she is careless about her studies  (c) she experiences vulnerability despite her usual confidence  (d) she gives up easily when things go wrong', tier: 2 },
      { q: 'Read this: "Thomas spoke loudly in meetings and took credit for the team\'s ideas. But when the project failed, he was the first to volunteer for the next one — working quietly, arriving early, leaving late." Select TWO inferences about Thomas that this passage BEST supports.\n(a) Thomas shows a contradiction — self-promotion in success but quiet effort in adversity  (b) Thomas is consistently arrogant and self-serving throughout  (c) Thomas may be more capable and determined than his initial behaviour suggests  (d) Thomas only volunteers so he can take credit again', tier: 3 },
    ],
  },

  'theme-identification': {
    label: 'Theme Identification',
    subject: 'reading', band: 'Grade 7', bandOrder: 0,
    prerequisites: ['character-analysis', 'inference-basic'],
    nextSkills: ['figurative-language', 'literary-devices-advanced', 'tone-mood'],
    questions: [
      { q: 'Read this: "Rosa worked all summer to buy a bicycle. The day she brought it home, her younger brother cried because he wanted one too. Rosa looked at her bike, then at her brother, and sighed." What is the THEME of this passage?\n(a) jealousy  (b) sacrifice  (c) hard work  (d) fairness', tier: 1 },
      { q: 'Read this: "The old fisherman had won every competition for twenty years. This year, a teenager beat him by two seconds. The old man shook the teenager\'s hand and said, \'Come back next year. I\'ll be ready.\'" What is the THEME of this passage?\n(a) jealousy between generations  (b) the importance of winning at all costs  (c) dignity and resilience in the face of defeat  (d) retirement and knowing when to stop', tier: 2 },
      { q: 'Read this: "Every morning the girl watched the astronaut from her window. He jogged past at 6am, in all weather. When she asked him why he ran so early, he said, \'Because the work is done before breakfast, or it isn\'t done at all.\'" Select TWO ways the author develops the theme of discipline.\n(a) the astronaut\'s daily routine demonstrates discipline through consistent action  (b) the girl\'s admiration shows she has adopted the same habits  (c) the astronaut\'s words state the theme directly through dialogue  (d) the weather is used to show the astronaut is reckless', tier: 3 },
    ],
  },

  'figurative-language': {
    label: 'Figurative Language',
    subject: 'reading', band: 'Grade 8', bandOrder: 1,
    prerequisites: ['theme-identification'],
    nextSkills: ['literary-devices-advanced', 'authors-craft'],
    questions: [
      { q: 'Read this: "The classroom was a zoo before the teacher arrived — students were swinging from their chairs, howling with laughter, and stampeding between the desks." What type of figurative language is used?\n(a) simile  (b) personification  (c) metaphor  (d) alliteration', tier: 1 },
      { q: 'Read this: "The city never sleeps — its streets pulse like a heartbeat, its towers reaching for something just beyond their grasp." Which TWO figurative devices are used in this passage?\n(a) personification  (b) simile  (c) alliteration  (d) onomatopoeia', tier: 2 },
      { q: 'Read this: "The sun was a furnace. The road shimmered and buckled in the heat. Even the shadows felt hot." Select TWO effects created by the figurative language in this passage.\n(a) it makes the heat feel extreme and oppressive  (b) it suggests the weather will soon improve  (c) it creates a physical, sensory impression of intense heat  (d) it shows the narrator is enjoying the sunshine', tier: 3 },
    ],
  },

  'point-of-view': {
    label: 'Point of View & Narrator',
    subject: 'reading', band: 'Grade 8', bandOrder: 1,
    prerequisites: ['character-analysis'],
    nextSkills: ['inference-advanced', 'tone-mood'],
    questions: [
      { q: 'Read this: "I walked into the room first. No one noticed me — they were all looking at Daniel, as usual." What can you infer about the narrator\'s feelings toward Daniel?\n(a) the narrator greatly admires Daniel  (b) the narrator feels overlooked or resentful  (c) the narrator and Daniel are close friends  (d) the narrator does not know who Daniel is', tier: 1 },
      { q: 'Read this: "She watched her sister win the trophy and clapped loudly with the rest. Later, alone, she sat on the stairs in the dark." Select TWO things a first-person narrator would reveal that this third-person narration CANNOT.\n(a) the character\'s exact inner thoughts and feelings  (b) what the trophy looked like  (c) whether her public reaction matched her private feelings  (d) that she sat on the stairs in the dark', tier: 2 },
      { q: 'Read this: "The hero arrived. From the villagers\' windows they watched him ride in — tall, gleaming, confident. From the hill at the edge of town, the old woman watched too. She had seen heroes before." Select TWO effects created by including the old woman\'s perspective.\n(a) it introduces doubt or irony about the hero\'s reception  (b) it confirms that the hero is genuinely heroic  (c) it suggests that experience leads to scepticism about heroism  (d) it shows the old woman is jealous of the hero', tier: 3 },
    ],
  },

  'inference-advanced': {
    label: 'Advanced Inference',
    subject: 'reading', band: 'Grade 8', bandOrder: 1,
    prerequisites: ['inference-basic', 'text-structure'],
    nextSkills: ['tone-mood', 'argument-structure', 'close-reading'],
    questions: [
      { q: 'Read this: "The factory had been closed for ten years. In the town, the bakery shut, then the pub, then the school. The bus stopped coming." What can you MOST REASONABLY infer happened to this town?\n(a) the town grew rapidly after the factory closed  (b) the town declined economically after the factory closed  (c) the residents successfully moved the factory elsewhere  (d) the town\'s businesses closed due to poor management unrelated to the factory', tier: 1 },
      { q: 'Read this: "Every morning for thirty years, the lighthouse keeper climbed the steps and lit the lamp. He noted the weather, the ships, the tides. He never missed a day. When the coastguard arrived one Tuesday, the lamp was unlit and the keeper\'s coat was still on the hook." Select TWO inferences that are SUPPORTED by this passage.\n(a) the keeper disappeared suddenly and unexpectedly  (b) the keeper retired and left voluntarily  (c) something interrupted the keeper\'s normal routine  (d) the lighthouse had been abandoned for years', tier: 2 },
      { q: 'Read this: "The politician spoke warmly of \'getting back to basics\' and \'the values that made us great.\' She did not specify which basics, or which values, or when greatness was. The crowd applauded." Select TWO things the author is implying in this passage.\n(a) the politician\'s language is deliberately vague to appeal to everyone  (b) the politician has a specific and detailed policy agenda  (c) the crowd\'s applause shows the vague language was effective  (d) the author admires the politician\'s skill as a communicator', tier: 3 },
    ],
  },

  'narrative-structure': {
    label: 'Narrative Structure',
    subject: 'reading', band: 'Grade 8', bandOrder: 1,
    prerequisites: ['sequence-retell', 'character-analysis'],
    nextSkills: ['literary-devices-advanced', 'text-structure-analysis'],
    questions: [
      { q: 'Read this: "Tom had dreamed of winning the race for years. He trained every morning, even in snow. On race day, he tripped at the starting line. He got up, finished last — and signed up for the next month\'s race." Which part of the story is the CLIMAX?\n(a) Tom dreamed of winning for years  (b) he trained every morning, even in snow  (c) he tripped at the starting line on race day  (d) he signed up for the next race', tier: 1 },
      { q: 'Read this: "Tom had dreamed of winning the race for years. He trained every morning, even in snow. On race day, he tripped at the starting line. He got up, finished last — and signed up for the next month\'s race." Select TWO ways the resolution affects the MEANING of the story.\n(a) it shows that Tom\'s true goal is persistence, not winning  (b) it suggests Tom is foolish to keep trying after failing  (c) it reframes failure as a beginning rather than an ending  (d) it proves Tom will definitely win the next race', tier: 2 },
      { q: 'Some stories begin at the ending and then work backwards. Select TWO reasons an author might choose this structure OVER telling events in chronological order.\n(a) to create immediate tension by showing the outcome and making the reader ask "how did we get here?"  (b) because chronological order is too difficult to write well  (c) to shift the reader\'s focus from what happens to why and how it happened  (d) to avoid having to write a satisfying conclusion', tier: 3 },
    ],
  },

  // ── CRITICAL ANALYSIS (Grade 9–10) ────────────────────────────────────────

  'tone-mood': {
    label: 'Tone & Mood',
    subject: 'reading', band: 'Grade 9', bandOrder: 2,
    prerequisites: ['inference-advanced', 'point-of-view'],
    nextSkills: ['argument-structure', 'rhetoric-introduction', 'literary-devices-advanced'],
    questions: [
      { q: 'Read this: "The abandoned playground sat rusting under the grey sky. A single swing creaked in the wind. No children came here anymore." What is the MOOD of this passage?\n(a) joyful and nostalgic  (b) melancholy and desolate  (c) tense and frightening  (d) peaceful and calm', tier: 1 },
      { q: 'Read this: "The last train had gone. The platform was empty except for a torn ticket and a forgotten umbrella. Rain began to fall, softly at first, then with a kind of determination." Select TWO words that BEST describe the mood of this passage.\n(a) melancholy  (b) tense and urgent  (c) lonely  (d) joyful and optimistic', tier: 2 },
      { q: 'Read this: "The new CEO walked the factory floor smiling, shaking hands, asking workers their names. He remembered each one. The workers smiled back — though a few exchanged glances." Select TWO techniques the author uses to create a gap between what is shown and what is implied.\n(a) the CEO\'s performed friendliness is contrasted with the workers\' private reaction  (b) the CEO is described positively throughout with no ambiguity  (c) the detail "a few exchanged glances" suggests the workers are not fully convinced  (d) the tone and mood are identical — there is no gap between them', tier: 3 },
    ],
  },

  'argument-structure': {
    label: 'Claims, Evidence & Reasoning',
    subject: 'reading', band: 'Grade 9', bandOrder: 2,
    prerequisites: ['inference-advanced', 'authors-purpose'],
    nextSkills: ['rhetoric-introduction', 'counterargument', 'complex-argumentation'],
    questions: [
      { q: 'Read this: "Schools should start later. Research shows teenagers\' brains are biologically set to sleep later. Early starts reduce academic performance and mental wellbeing." Which sentence states the MAIN CLAIM of this passage?\n(a) "Research shows teenagers\' brains are biologically set to sleep later" — a research finding  (b) "Schools should start later" — the main argument being made  (c) "Early starts reduce academic performance" — a consequence  (d) all three sentences together form the claim', tier: 1 },
      { q: 'Read this: "Social media causes anxiety in teenagers. A 2022 study found students who used social media more than 3 hours daily were 40% more likely to report anxiety. When students took a two-week break, anxiety scores dropped significantly." Select TWO questions that would BEST test the strength of this argument.\n(a) did the students change anything else in their routine during the break?  (b) what was the weather like during the study period?  (c) does a correlation between social media use and anxiety prove that social media CAUSES it?  (d) how many students enjoyed using social media before the study?', tier: 2 },
      { q: 'Read this: "We should ban cars from city centres. Cities with car-free zones — Oslo, Amsterdam — have seen falls in pollution, rises in retail footfall, and improvements in wellbeing. Critics say it hurts business; the data says otherwise." Select TWO structural features of this argument.\n(a) it includes a counterargument and immediately rebuts it  (b) it uses specific city examples as evidence for the claim  (c) it relies entirely on emotional language with no factual evidence  (d) it presents only one side with no acknowledgement of opposition', tier: 3 },
    ],
  },

  'literary-devices-advanced': {
    label: 'Advanced Literary Devices',
    subject: 'reading', band: 'Grade 10', bandOrder: 4,
    prerequisites: ['figurative-language', 'theme-identification', 'tone-mood'],
    nextSkills: ['authors-craft', 'close-reading', 'rhetorical-analysis'],
    questions: [
      { q: 'Read this: "The torch of liberty must never be extinguished — even if we have to fight to keep it burning." What literary device is PRIMARILY used?\n(a) simile  (b) extended metaphor  (c) alliteration  (d) personification', tier: 1 },
      { q: 'Read this: "The torch of liberty burns in every heart. Its flame is passed from one generation to the next — we are its keepers now, and to let it die is to betray all who came before." Select TWO literary devices used in this passage.\n(a) extended metaphor  (b) direct address  (c) onomatopoeia  (d) flashback', tier: 2 },
      { q: 'Read this: "It was the best of times, it was the worst of times, it was the age of wisdom, it was the age of foolishness." Select TWO effects created by the repeated parallel structure.\n(a) it creates a sense of paradox — suggesting two contradictory things were simultaneously true  (b) it shows the narrator is confused about history  (c) the parallel structure gives each contradiction equal weight and authority  (d) it implies the narrator prefers one era over the other', tier: 2 },
      { q: 'Read this: "The captain steered his ship of state through treacherous waters. Below deck, the passengers argued about the colour of the curtains." Select TWO things the author is implying about politics or leadership.\n(a) leaders must navigate serious dangers while those they lead focus on trivial concerns  (b) the passage suggests the captain is incompetent  (c) the contrast between "treacherous waters" and "colour of the curtains" highlights political dysfunction  (d) the passengers are right to focus on the curtains because it is their home', tier: 3 },
    ],
  },

  'rhetoric-introduction': {
    label: 'Rhetoric: Ethos, Pathos, Logos',
    subject: 'reading', band: 'Grade 10', bandOrder: 4,
    prerequisites: ['argument-structure', 'tone-mood'],
    nextSkills: ['rhetorical-analysis', 'counterargument'],
    questions: [
      { q: 'Read this: "As a doctor who has treated thousands of patients, I know that smoking causes irreversible lung damage. Every cigarette is a step toward a shorter life." Which rhetorical appeal is PRIMARILY used?\n(a) pathos — appealing to the audience\'s emotions  (b) logos — using statistics and data  (c) ethos — establishing credibility through expertise  (d) kairos — appealing to the urgency of timing', tier: 1 },
      { q: 'Read this: "As a surgeon who has performed thousands of operations, I can tell you: every minute without proper funding costs lives. Children are dying while politicians debate. We need action now." Select TWO rhetorical appeals used in this passage.\n(a) ethos  (b) pathos  (c) logos  (d) kairos', tier: 2 },
      { q: 'Read this: "For just £1 a day — less than a cup of coffee — you can provide clean water for a family of four. Millions of children walk miles every morning so their family can survive. You can help." Select TWO rhetorical appeals used in this passage.\n(a) logos — the cost comparison provides a relatable statistic  (b) ethos — the author establishes their personal credibility  (c) pathos — "children walk miles every morning" creates an emotional response  (d) kairos — it references a current news event to create urgency', tier: 2 },
      { q: 'Read this: "Experts agree that exercise extends lifespan. Studies across 50 countries confirm it. And yet we sit. We scroll. We tell ourselves we\'ll start on Monday." Select TWO things the final three short sentences ("And yet we sit. We scroll. We tell ourselves we\'ll start on Monday.") achieve that the rest of the passage does not.\n(a) they shift from facts about others to implicating the reader directly  (b) they introduce a new piece of statistical evidence  (c) the short, fragmented structure mimics the distracted behaviour being described  (d) they use ethos by referencing the author\'s own expertise', tier: 3 },
    ],
  },

  'text-structure-analysis': {
    label: 'How Structure Shapes Meaning',
    subject: 'reading', band: 'Grade 10', bandOrder: 4,
    prerequisites: ['text-structure', 'narrative-structure', 'literary-devices-advanced'],
    nextSkills: ['close-reading', 'compare-contrast-texts'],
    questions: [
      { q: 'A poem has four four-line stanzas, then a final line that stands alone. What is the MOST LIKELY reason the poet isolated the final line?\n(a) the poet ran out of ideas for a fourth stanza  (b) to create dramatic emphasis and make the final thought stand apart  (c) because isolated lines are always more poetic  (d) to show that the final idea is less important than the rest', tier: 1 },
      { q: 'A speech moves in this order: statistics → personal story → call to action. Select TWO reasons why this order is more persuasive than the reverse.\n(a) statistics establish the problem logically before the emotion of the personal story  (b) opening with statistics is always the most powerful choice in any speech  (c) the personal story makes the audience care before they are asked to act  (d) a call to action is always ineffective unless placed last', tier: 2 },
      { q: 'A novel alternates between chapters set in 1944 and chapters set in 2005. Select TWO reasons an author might choose this structure over a straightforward chronological story.\n(a) to create suspense by withholding information from one timeline that only the other reveals  (b) because readers prefer not to read events in chronological order  (c) to allow the reader to discover connections between past and present gradually  (d) alternating timelines always make a novel more commercially successful', tier: 3 },
    ],
  },

  'compare-contrast-texts': {
    label: 'Comparing Texts',
    subject: 'reading', band: 'Grade 10', bandOrder: 4,
    prerequisites: ['text-structure-analysis', 'argument-structure'],
    nextSkills: ['synthesising-sources', 'close-reading'],
    questions: [
      { q: 'Text A: "Technology is making us smarter — access to information has never been easier." Text B: "Technology is making us lazier — we no longer need to remember anything." What is the KEY DIFFERENCE between these two arguments?\n(a) they discuss different types of technology  (b) Text A focuses on what technology provides; Text B focuses on what technology removes  (c) Text A is scientific while Text B is personal opinion  (d) they have completely opposite intended audiences', tier: 1 },
      { q: 'Text A (1960): "Space exploration is the greatest achievement of human civilisation." Text B (2020): "Space exploration diverts billions from poverty, climate, and healthcare." Select TWO factors that BEST explain why the texts reach opposite conclusions.\n(a) the historical context differs — 1960 was the space race, when exploration felt urgent and exciting  (b) Text A has a better argument because it is older  (c) Text B is shaped by modern awareness of global crises that did not dominate 1960s priorities  (d) the texts were written in different countries, which explains the disagreement', tier: 2 },
      { q: 'Text A argues rising property prices benefit homeowners and boost local economies. Text B argues they displace low-income residents who built the community. Both use economic data. Select TWO statements that BEST explain how the same data can support opposite conclusions.\n(a) each text measures "benefit" differently — one tracks homeowner wealth, the other tracks community wellbeing  (b) one text must be wrong because data cannot support two different conclusions  (c) the texts focus on different groups — one on owners, the other on renters and workers  (d) the economic data must have been collected at different times, making comparisons invalid', tier: 3 },
    ],
  },

  // ── ADVANCED ANALYSIS (Grade 11–12) ───────────────────────────────────────

  'close-reading': {
    label: 'Close Reading',
    subject: 'reading', band: 'Grade 11', bandOrder: 6,
    prerequisites: ['literary-devices-advanced', 'inference-advanced', 'text-structure-analysis'],
    nextSkills: ['rhetorical-analysis', 'authors-craft', 'complex-inference'],
    questions: [
      { q: 'Read this three-word sentence: "The light failed."\nExplain how word choice and sentence structure contribute to its potential meanings. What literary techniques are at work even in three words?', tier: 1 },
      { q: 'Read this: "She had been beautiful, once — before the war made her face into a geography of loss."\nClose read this sentence: identify EVERY technique (metaphor, juxtaposition, diction, etc.) and explain the precise effect of each word or phrase.', tier: 2 },
      { q: 'Read this: "Nothing was lost. Nothing was found. Everything was exactly as it had always been, which was the worst thing of all."\nConduct a full close reading: identify every literary and structural technique. Explain how repetition, paradox, and the final clause work together. What does "the worst thing of all" imply?', tier: 3 },
    ],
  },

  'rhetorical-analysis': {
    label: 'Rhetorical Analysis',
    subject: 'reading', band: 'Grade 11', bandOrder: 6,
    prerequisites: ['rhetoric-introduction', 'tone-mood', 'argument-structure'],
    nextSkills: ['close-reading', 'complex-argumentation', 'authors-craft'],
    questions: [
      { q: 'Read this: "We are the first generation to feel the effects of climate change and the last generation that can do something about it."\nIdentify the rhetorical techniques (e.g. anaphora, antithesis, inclusive language). What emotional and logical effect does each create?', tier: 1 },
      { q: 'Read this: "They told us to be patient. They told our parents to be patient. They told our grandparents to be patient. Patience has a cost."\nAnalyse: identify the device across the first three sentences and explain its cumulative effect. Then analyse the final sentence — why is it structurally different, and what effect does that create?', tier: 2 },
      { q: 'Read this: "This government has presided over the longest period of wage stagnation in living memory. They have watched homelessness double, foodbank use triple, and NHS waiting lists reach historic highs. And yet — they stand here today and ask for your trust."\nWrite a full rhetorical analysis: purpose, audience, tone, rhetorical appeals, specific techniques. Explain how the structure of the final sentence amplifies the effect.', tier: 3 },
    ],
  },

  'complex-inference': {
    label: 'Complex & Critical Inference',
    subject: 'reading', band: 'Grade 11', bandOrder: 6,
    prerequisites: ['inference-advanced', 'close-reading'],
    nextSkills: ['authors-craft', 'complex-argumentation'],
    questions: [
      { q: 'Read this: "He corrected her pronunciation. He offered to carry her bag. He told her she was very \'well-spoken\' for someone from where she came from."\nWhat is being implied about this character\'s behaviour? What do these actions reveal about his assumptions?', tier: 1 },
      { q: 'Read this: "The travel writer described the village as \'unspoiled\', the people as \'simple but happy\', and the food as \'surprisingly refined\'." What do these word choices imply about the writer\'s perspective and assumptions? What is problematic about each phrase?', tier: 2 },
      { q: 'Read this: "The memoir describes the author\'s childhood home as always warm, always full of food, always smelling of bread. She never mentions her father directly — only the absence of his coat on the hook."\nWhat is inferred about the father? How does absence function as a narrative device here? What does "the coat on the hook" imply about loss, memory, and what is left unsaid in memoir?', tier: 3 },
    ],
  },

  'authors-craft': {
    label: "Author's Craft & Diction",
    subject: 'reading', band: 'Grade 11', bandOrder: 6,
    prerequisites: ['figurative-language', 'close-reading', 'tone-mood'],
    nextSkills: ['complex-inference', 'ap-literary-analysis'],
    questions: [
      { q: '"She walked into the room" vs "She swept into the room" vs "She crept into the room."\nAll say the same thing happened. What is DIFFERENT about each? What does word choice — diction — reveal about character and tone?', tier: 1 },
      { q: 'Read this: "The soldiers filed out. One by one. Quiet. No drums. No flags."\nExplain how sentence LENGTH and STRUCTURE create meaning. What would be lost if you rewrote this as one grammatically complete sentence?', tier: 2 },
      { q: 'Read this: "The charity report spoke of \'addressing food insecurity\' and \'supporting vulnerable populations\'. The family it described ate bread twice a day. The children wore their cousins\' old shoes."\nAnalyse the juxtaposition of institutional language and concrete detail as a craft technique. What is the author\'s argument about language itself? What effect does the final image create?', tier: 3 },
    ],
  },

  'counterargument': {
    label: 'Counterargument & Rebuttal',
    subject: 'reading', band: 'Grade 11', bandOrder: 6,
    prerequisites: ['argument-structure', 'rhetoric-introduction'],
    nextSkills: ['complex-argumentation', 'synthesising-sources'],
    questions: [
      { q: 'Claim: "Homework should be banned."\nWrite ONE counterargument. Then write a rebuttal — a response that defends the original claim against your counterargument.', tier: 1 },
      { q: 'Read this: "Some argue zoos are cruel — animals are confined unnaturally. However, modern zoos fund conservation of endangered species and educate millions about wildlife."\nEvaluate the rebuttal. Does it fully answer the counterargument? What is it NOT addressing?', tier: 2 },
      { q: 'Read this: "Critics of universal basic income argue it will discourage people from working. But evidence from pilot schemes in Finland and Kenya suggests recipients were MORE likely to seek employment — freed from the fear of complete destitution."\nAnalyse the structure of this argument. How does the counterargument actually strengthen the original claim? Name the rhetorical technique. Evaluate whether the evidence is sufficient.', tier: 3 },
    ],
  },

  'synthesising-sources': {
    label: 'Synthesising Multiple Sources',
    subject: 'reading', band: 'Grade 11+', bandOrder: 7,
    prerequisites: ['compare-contrast-texts', 'counterargument'],
    nextSkills: ['ap-language-analysis', 'research-synthesis'],
    questions: [
      { q: 'You have three sources on climate change: Source A (scientific report), Source B (newspaper article), Source C (social media post).\nRank them by reliability and give ONE reason per source.', tier: 1 },
      { q: 'Source A: "Exercise reduces dementia risk by 30%."\nSource B: "Correlation between exercise and cognitive health is clear, but causation is unproven."\nHow do these sources BOTH inform and complicate each other? What would a careful writer say when synthesising them?', tier: 2 },
      { q: 'Three historians describe the same event: one emphasises economic causes, one political failures, one individual leaders.\nExplain how a synthesis essay should handle competing interpretations. What is "synthesis" as opposed to summary? How do you write about sources that disagree without simply picking a side?', tier: 3 },
    ],
  },

  // ── AP LEVEL (bandOrder 8–9) ───────────────────────────────────────────────

  'ap-language-analysis': {
    label: 'AP Language & Composition',
    subject: 'reading', band: 'AP · Year 1', bandOrder: 8,
    prerequisites: ['rhetorical-analysis', 'synthesising-sources'],
    nextSkills: ['complex-argumentation', 'research-synthesis'],
    questions: [
      { q: 'Read this: "In the long run, we are all dead. Economists set themselves too easy, too useless a task if in tempestuous seasons they can only tell us that when the storm is past, the ocean is flat again." (Keynes)\nIdentify the rhetorical strategy in the first sentence. What argument does the analogy in the second sentence make?', tier: 1 },
      { q: 'Read this: "Education is not the filling of a pail, but the lighting of a fire." (attributed to Yeats)\nFull rhetorical analysis of this single sentence: identify the antithesis, explain both metaphors, evaluate which is more effective and why, explain the argument about education being made.', tier: 2 },
      { q: 'Read this: "We do not read and write poetry because it is cute. We read and write poetry because we are members of the human race. And the human race is filled with passion. Medicine, law, business, engineering — these are noble pursuits and necessary to sustain life. But poetry, beauty, romance, love — these are what we stay alive for."\nFull AP Language rhetorical analysis: purpose, audience, tone, argument, and THREE specific techniques with effects. Evaluate the strengths and potential weaknesses of the argument.', tier: 3 },
    ],
  },

  'ap-literary-analysis': {
    label: 'AP Literature Close Reading',
    subject: 'reading', band: 'AP · Year 1', bandOrder: 8,
    prerequisites: ['close-reading', 'authors-craft', 'complex-inference'],
    nextSkills: ['research-synthesis'],
    questions: [
      { q: 'Read this: "I\'m Nobody! Who are you? / Are you — Nobody — too?" (Dickinson)\nIdentify the devices used. What does the speaker mean by "nobody"? What is the effect of addressing the reader directly?', tier: 1 },
      { q: 'Read this opening line: "It was a bright cold day in April, and the clocks were striking thirteen." (Orwell, 1984)\nClose literary analysis: identify the dissonance and explain its effect. What expectations does Orwell set up and immediately subvert? What does "thirteen" do to the reader?', tier: 2 },
      { q: 'Read this: "So we beat on, boats against the current, borne back ceaselessly into the past." (Fitzgerald, The Great Gatsby)\nFull AP Literary analysis: identify and explain the extended metaphor, analyse phonetic and syntactic effects, explain what the sentence argues about the American Dream, and evaluate how it functions as a closing line.', tier: 3 },
    ],
  },

  'complex-argumentation': {
    label: 'Complex Argumentation',
    subject: 'reading', band: 'AP · Year 2', bandOrder: 9,
    prerequisites: ['ap-language-analysis', 'counterargument', 'complex-inference'],
    nextSkills: ['research-synthesis'],
    questions: [
      { q: 'What is the difference between an ARGUMENT and a PERSUASIVE TEXT? Can a text be persuasive without being a good argument? Give an example.', tier: 1 },
      { q: 'A philosopher argues: "If you cannot imagine a piece of evidence that would change your mind, you are not making an argument — you are expressing a belief."\nExplain this claim. Do you agree? Give one example of a falsifiable argument and one that is NOT.', tier: 2 },
      { q: 'Read this: "Every reasonable person wants a fair society. A fair society rewards hard work. Therefore, any policy that redistributes wealth earned through hard work is unfair."\nIdentify the logical fallacy or weak link. Reconstruct it as a stronger syllogism. What evidence would be needed to make the original claim defensible?', tier: 3 },
    ],
  },

  'research-synthesis': {
    label: 'Research & Synthesis',
    subject: 'reading', band: 'AP · Year 2', bandOrder: 9,
    prerequisites: ['synthesising-sources', 'ap-language-analysis', 'complex-argumentation'],
    nextSkills: [],
    questions: [
      { q: 'What is the difference between a PRIMARY SOURCE and a SECONDARY SOURCE? Give one example of each for the topic of the Second World War.', tier: 1 },
      { q: 'You are writing a research essay. Three sources support your thesis; two contradict it.\nWhy MUST a strong essay engage with the two contradicting sources? What is the risk of ignoring them? What is the academic term for ignoring contradictory evidence?', tier: 2 },
      { q: 'A student\'s essay opens: "Many scholars have argued about climate change for years. Some say it is real, others are not sure. This essay will look at both sides."\nIdentify FOUR specific weaknesses in this introduction from a research-writing perspective. Rewrite the opening paragraph as it should appear in a high-level academic essay.', tier: 3 },
    ],
  },

}

// ─── CLUSTER MAP (Maths) ──────────────────────────────────────────────────────
// Maps every Maths node ID → one of 5 topic clusters.
// Used by calibAdvance() to ensure the diagnostic samples across all clusters
// instead of following a single chain through one branch of the graph.
// Other subjects don't have cluster assignments (cluster jumps are maths-only).
export const NODE_CLUSTERS = {
  maths: {
    // ── Number ────────────────────────────────────────────────────────────────
    'counting-number':          'number',
    'addition-subtraction':     'number',
    'place-value':              'number',
    'times-tables':             'number',
    'multiplication-division':  'number',
    'basic-fractions':          'number',
    'fractions-equivalent':     'number',
    'decimals-intro':           'number',
    'negative-numbers':         'number',
    'number-basics':            'number',
    'fractions':                'number',
    'percentages':              'number',
    'ratio':                    'number',
    'surds':                    'number',
    // ── Algebra ───────────────────────────────────────────────────────────────
    'algebra-intro':            'algebra',
    'basic-algebra':            'algebra',
    'linear-equations':         'algebra',
    'expanding-brackets':       'algebra',
    'inequalities':             'algebra',
    'simultaneous-equations':   'algebra',
    'quadratic-factorising':    'algebra',
    'completing-the-square':    'algebra',
    'quadratic-formula':        'algebra',
    'discriminant':             'algebra',
    'further-algebra':          'algebra',
    'logarithms':               'algebra',
    'binomial-expansion':       'algebra',
    'sequences-series':         'algebra',
    'mathematical-proof':       'algebra',
    'quadratic-simultaneous':   'algebra',
    'quadratic-inequalities':   'algebra',
    // ── Geometry ──────────────────────────────────────────────────────────────
    'basic-area-perimeter':     'geometry',
    'angles-shapes':            'geometry',
    'coordinates-intro':        'geometry',
    'straight-line-graphs':     'geometry',
    'quadratic-graphs':         'geometry',
    'trigonometry':             'geometry',
    'sine-cosine-rule':         'geometry',
    'trig-identities':          'geometry',
    'further-trig':             'geometry',
    'vectors':                  'geometry',
    'transformations':          'geometry',
    'parametric':               'geometry',
    // ── Statistics ────────────────────────────────────────────────────────────
    'statistics-basics':        'statistics',
    // ── Calculus ──────────────────────────────────────────────────────────────
    'calculus-intro':           'calculus',
    'integration':              'calculus',
    'calculus-applications':    'calculus',
  },

  // ─── PHYSICS ────────────────────────────────────────────────────────────────
  physics: {
    // ── Forces & Motion ───────────────────────────────────────────────────────
    'pushes-pulls':             'forces',
    'forces-motion-primary':    'forces',
    'forces-basics':            'forces',
    'momentum':                 'forces',
    'circular-motion':          'forces',
    'gravitation':              'forces',
    // ── Energy ────────────────────────────────────────────────────────────────
    'energy':                   'energy',
    'simple-harmonic':          'energy',
    // ── Waves & Light ─────────────────────────────────────────────────────────
    'waves':                    'waves',
    'optics':                   'waves',
    'ac-dc':                    'waves',
    // ── Electricity ───────────────────────────────────────────────────────────
    'electricity-basics':       'electricity',
    'electromagnetism':         'electricity',
    // ── Atomic & Nuclear ──────────────────────────────────────────────────────
    'atomic-structure':         'atomic',
    'quantum':                  'atomic',
    'nuclear':                  'atomic',
  },

  // ─── CHEMISTRY ──────────────────────────────────────────────────────────────
  chemistry: {
    // ── Atomic Theory ─────────────────────────────────────────────────────────
    'materials-properties':     'atomic',
    'changes-matter':           'atomic',
    'atomic-structure-chem':    'atomic',
    'periodic-table':           'atomic',
    // ── Bonding & Structure ───────────────────────────────────────────────────
    'bonding':                  'bonding',
    'structure-properties':     'bonding',
    // ── Quantitative ──────────────────────────────────────────────────────────
    'moles':                    'quantitative',
    'concentration':            'quantitative',
    // ── Reactions ─────────────────────────────────────────────────────────────
    'reactions':                'reactions',
    'rates':                    'reactions',
    // ── Equilibrium ───────────────────────────────────────────────────────────
    'equilibrium':              'equilibrium',
  },

  // ─── BIOLOGY ────────────────────────────────────────────────────────────────
  biology: {
    // ── Cells ─────────────────────────────────────────────────────────────────
    'living-things':            'cells',
    'body-health':              'cells',
    'cell-structure':           'cells',
    'cell-transport':           'cells',
    'enzymes':                  'cells',
    // ── Genetics ──────────────────────────────────────────────────────────────
    'dna-genetics':             'genetics',
    'genetic-engineering':      'genetics',
    'evolution':                'genetics',
    // ── Body Systems ──────────────────────────────────────────────────────────
    'breathing':                'systems',
    'digestion':                'systems',
  },

  // ─── HISTORY ────────────────────────────────────────────────────────────────
  history: {
    // ── Analysis Skills ───────────────────────────────────────────────────────
    'source-analysis':          'skills',
    'causation':                'skills',
    'significance':             'skills',
    // ── WW1 ───────────────────────────────────────────────────────────────────
    'ww1-causes':               'ww1',
    'versailles':               'ww1',
    'ww1-trench':               'ww1',
    // ── Interwar Period ───────────────────────────────────────────────────────
    'weimar':                   'interwar',
    'ww2-causes':               'interwar',
  },

  // ─── ENGLISH LIT ────────────────────────────────────────────────────────────
  'english-lit': {
    // ── Writing Skills ────────────────────────────────────────────────────────
    'pee-structure':            'writing',
    'language-analysis':        'writing',
    // ── Literary Analysis ─────────────────────────────────────────────────────
    'context':                  'analysis',
    'structure-form':           'analysis',
    'themes-comparison':        'analysis',
  },

  // ─── ECONOMICS ──────────────────────────────────────────────────────────────
  economics: {
    // ── Microeconomics ────────────────────────────────────────────────────────
    'supply-demand':            'micro',
    'elasticity':               'micro',
    'market-failure':           'micro',
    'firms-revenue':            'micro',
    // ── Macroeconomics ────────────────────────────────────────────────────────
    'government-intervention':  'macro',
    'fiscal-monetary':          'macro',
    'macroeconomics':           'macro',
  },

  // ─── COMPUTER SCIENCE ───────────────────────────────────────────────────────
  'computer-science': {
    // ── Fundamentals ──────────────────────────────────────────────────────────
    'what-is-computing':        'fundamentals',
    'algorithms-logic':         'fundamentals',
    'variables-datatypes':      'fundamentals',
    // ── Programming ───────────────────────────────────────────────────────────
    'selection-iteration':      'programming',
    'subroutines':              'programming',
    'oop':                      'programming',
    // ── Data & Algorithms ─────────────────────────────────────────────────────
    'data-structures':          'data',
    'sorting':                  'data',
    'complexity':               'data',
    'algorithms':               'data',
  },

  // ─── READING ────────────────────────────────────────────────────────────────
  reading: {
    // ── Foundations ───────────────────────────────────────────────────────────
    'phonics-decoding':         'foundations',
    'sight-words-fluency':      'foundations',
    'basic-sentence-comp':      'foundations',
    // ── Comprehension ─────────────────────────────────────────────────────────
    'main-idea-details':        'comprehension',
    'sequence-retell':          'comprehension',
    'context-clues-basic':      'comprehension',
    'grammar-mechanics':        'comprehension',
    'vocabulary-in-context':    'comprehension',
    'authors-purpose':          'comprehension',
    'nonfiction-features':      'comprehension',
    'inference-basic':          'comprehension',
    'text-structure':           'comprehension',
    // ── Literary Elements ─────────────────────────────────────────────────────
    'character-analysis':       'literary',
    'theme-identification':     'literary',
    'figurative-language':      'literary',
    'point-of-view':            'literary',
    'inference-advanced':       'literary',
    'narrative-structure':      'literary',
    // ── Analysis ──────────────────────────────────────────────────────────────
    'tone-mood':                'analysis',
    'argument-structure':       'analysis',
    'literary-devices-advanced':'analysis',
    'rhetoric-introduction':    'analysis',
    'text-structure-analysis':  'analysis',
    'compare-contrast-texts':   'analysis',
    // ── Advanced & AP ─────────────────────────────────────────────────────────
    'close-reading':            'advanced',
    'rhetorical-analysis':      'advanced',
    'complex-inference':        'advanced',
    'authors-craft':            'advanced',
    'counterargument':          'advanced',
    'synthesising-sources':     'advanced',
    'ap-language-analysis':     'advanced',
    'ap-literary-analysis':     'advanced',
    'complex-argumentation':    'advanced',
    'research-synthesis':       'advanced',
  },
}

/** Human-readable label for each cluster key, per subject */
export const CLUSTER_LABELS = {
  maths: {
    number:     'Number',
    algebra:    'Algebra',
    geometry:   'Geometry',
    statistics: 'Statistics',
    calculus:   'Calculus',
  },
  physics: {
    forces:      'Forces & Motion',
    energy:      'Energy',
    waves:       'Waves & Light',
    electricity: 'Electricity',
    atomic:      'Atomic & Nuclear',
  },
  chemistry: {
    atomic:       'Atomic Theory',
    bonding:      'Bonding',
    quantitative: 'Quantitative',
    reactions:    'Reactions',
    equilibrium:  'Equilibrium',
  },
  biology: {
    cells:    'Cells',
    genetics: 'Genetics',
    systems:  'Body Systems',
  },
  history: {
    skills:   'Analysis Skills',
    ww1:      'WW1',
    interwar: 'Interwar',
  },
  'english-lit': {
    writing:  'Writing Skills',
    analysis: 'Literary Analysis',
  },
  economics: {
    micro: 'Microeconomics',
    macro: 'Macroeconomics',
  },
  'computer-science': {
    fundamentals: 'Fundamentals',
    programming:  'Programming',
    data:         'Data & Algorithms',
  },
  reading: {
    foundations:   'Foundations',
    comprehension: 'Comprehension',
    literary:      'Literary Elements',
    analysis:      'Analysis',
    advanced:      'Advanced & AP',
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
  reading: READING,
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
  reading:          'inference-basic',
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
  reading:          'Reading',
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
  reading:          '📚',
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

  // ── PHYSICS — two-bracket ladder ──────────────────────────────────────────
  physics: [
    {
      label: 'Quick Check 1',
      q: 'Two quick checks — answer both:\n(a) A 4 kg object accelerates at 3 m/s². What force acts on it?\n(b) A moving car doubles its speed. What happens to its kinetic energy — does it double, halve, or quadruple?',
      nodeId: 'forces-basics',
      onPass: 'momentum',   // solid → skip Foundation, enter at GCSE Higher
      onFail: null,         // not solid → try bracket 2 (primary check)
    },
    {
      label: 'Quick Check 2',
      q: 'Two quick checks — answer both:\n(a) A ball rolls across a carpet and slows to a stop. What force is acting on it?\n(b) A cyclist travels 60 km in 2 hours. What is their average speed in km/h?',
      nodeId: 'forces-motion-primary',
      onPass: 'forces-basics',  // solid → GCSE Foundation start
      onFail: 'pushes-pulls',   // not solid → primary start
    },
  ],

  // ── CHEMISTRY — two-bracket ladder ────────────────────────────────────────
  chemistry: [
    {
      label: 'Quick Check 1',
      q: 'Two quick checks — answer both:\n(a) How many protons, neutrons and electrons does Carbon-12 have?\n(b) Chlorine has two isotopes: ³⁵Cl (75%) and ³⁷Cl (25%). What is the approximate relative atomic mass?',
      nodeId: 'atomic-structure-chem',
      onPass: 'bonding',   // solid → skip Foundation, enter at GCSE Higher
      onFail: null,        // not solid → try bracket 2
    },
    {
      label: 'Quick Check 2',
      q: 'Two quick checks — answer both:\n(a) What happens to water when it is heated to 100°C? What is this change called?\n(b) Is burning paper a reversible or irreversible change? How do you know?',
      nodeId: 'changes-matter',
      onPass: 'atomic-structure-chem', // solid → GCSE Foundation start
      onFail: 'materials-properties',  // not solid → primary start
    },
  ],

  // ── BIOLOGY — two-bracket ladder ──────────────────────────────────────────
  biology: [
    {
      label: 'Quick Check 1',
      q: 'Two quick checks — answer both:\n(a) Name two structures found in a plant cell but NOT in an animal cell.\n(b) In one sentence, what is osmosis?',
      nodeId: 'cell-structure',
      onPass: 'dna-genetics',  // solid → skip Foundation, enter at GCSE Higher
      onFail: null,            // not solid → try bracket 2
    },
    {
      label: 'Quick Check 2',
      q: 'Two quick checks — answer both:\n(a) Name the organ that pumps blood around your body. Name one thing blood carries to your muscles.\n(b) What is the difference between a vertebrate and an invertebrate? Give one example of each.',
      nodeId: 'body-health',
      onPass: 'cell-structure', // solid → GCSE Foundation start
      onFail: 'living-things',  // not solid → primary start
    },
  ],

  // ── COMPUTER SCIENCE — two-bracket ladder ─────────────────────────────────
  'computer-science': [
    {
      label: 'Quick Check 1',
      q: 'Two quick checks — answer both:\n(a) What is the difference between an integer and a float? Give one example of each.\n(b) Write pseudocode for a loop that prints the numbers 1 to 5.',
      nodeId: 'variables-datatypes',
      onPass: 'subroutines',  // solid → skip Foundation, enter at GCSE Higher
      onFail: null,           // not solid → try bracket 2
    },
    {
      label: 'Quick Check 2',
      q: 'Two quick checks — answer both:\n(a) What is an algorithm? Give one everyday example (not a computer program).\n(b) Explain the difference between hardware and software. Give one example of each.',
      nodeId: 'algorithms-logic',
      onPass: 'variables-datatypes', // solid → GCSE Foundation start
      onFail: 'what-is-computing',   // not solid → primary start
    },
  ],

  // ── ECONOMICS — single bracket (no primary level needed) ──────────────────
  economics: [
    {
      label: 'Quick Check',
      q: 'Two quick checks — answer both:\n(a) If demand for a good increases and supply stays the same, what happens to the equilibrium price?\n(b) Price rises by 10% and quantity demanded falls by 20%. What is the price elasticity of demand (PED)?',
      nodeId: 'supply-demand',
      onPass: 'market-failure',  // solid → skip Foundation, enter at GCSE Higher
      onFail: 'supply-demand',
    },
  ],

  // ── READING — three-bracket ladder ───────────────────────────────────────
  // Bracket 1 (Grade 8–9): inference + figurative language
  //   ✅ Pass → enter at literary-devices-advanced (Grade 10)
  //   ❌ Fail → Bracket 2
  // Bracket 2 (Grade 4–5): main idea + context clues (accessible vocabulary)
  //   ✅ Pass → enter at character-analysis (Grade 7)
  //   ❌ Fail → Bracket 3
  // Bracket 3 (Grade 1–2): basic sentence recall + simple sequencing
  //   ✅ Pass → enter at main-idea-details (Grade 3)
  //   ❌ Fail → enter at basic-sentence-comp (Grade 2)
  reading: [
    {
      label: 'Quick Check 1',
      q: 'Read this: "The old woman arrived early every Sunday and sat in the same pew. She never spoke to anyone. But when the church announced it would close, she was the first to sign the petition." Select TWO inferences BEST supported by this passage.\n(a) the church holds deep personal significance for her  (b) she attends only out of habit with no real attachment  (c) her silence suggests private devotion rather than indifference  (d) she signed the petition because she enjoys protesting',
      nodeId: 'inference-advanced',
      onPass: 'literary-devices-advanced',  // solid → skip to Grade 10 entry
      onFail: null,                          // not solid → try bracket 2
    },
    {
      label: 'Quick Check 2',
      q: 'Read this: "Dolphins are intelligent animals. They can learn tricks, communicate using clicks and whistles, and scientists believe they even have their own names." What is the MAIN IDEA of this passage?\n(a) dolphins are dangerous to humans  (b) dolphins are very intelligent animals  (c) scientists study dolphins in the ocean  (d) dolphins make good pets',
      nodeId: 'main-idea-details',
      onPass: 'character-analysis',  // solid → Grade 7 entry
      onFail: null,                  // not solid → try bracket 3
    },
    {
      label: 'Quick Check 3',
      q: 'Read this: "First Tom put on his shoes. Then he grabbed his bag. Finally he ran to the bus stop." What did Tom do LAST?\n(a) put on his shoes  (b) grabbed his bag  (c) ran to the bus stop  (d) had breakfast',
      nodeId: 'sight-words-fluency',
      onPass: 'main-idea-details',    // solid → Grade 3 entry
      onFail: 'basic-sentence-comp',  // not solid → Grade 2 start
    },
  ],
}

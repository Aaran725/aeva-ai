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

      { q: 'Explain two different strategies to add 9 + 7 without counting one by one. Which is fastest and why?', tier: 4 },
      { q: 'Find all the ways to make 20 using exactly two different whole numbers. Is there a pattern in your pairs?', tier: 5 },    ],
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

      { q: 'Explain why 53 − 28 = 25 using two different methods (e.g. column and number line). Which do you prefer and why?', tier: 4 },
      { q: 'The answer is 100. Write as many addition sums as you can using exactly two 2-digit numbers. What patterns do you notice in the pairs?', tier: 5 },    ],
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

      { q: 'Explain why the digit 5 means different things in 5,000 and 500. Use the words ones, tens, hundreds, thousands.', tier: 4 },
      { q: 'Using the digits 3, 7, 1, 9 exactly once each, how many different 4-digit numbers can you make? What is the largest? Smallest? Find their sum.', tier: 5 },    ],
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

      { q: 'Explain why 6 × 7 = 7 × 6 without just saying both equal 42. Use an array of rows and columns to justify it.', tier: 4 },
      { q: 'Which numbers up to 50 are multiples of BOTH 4 and 6? List them. Is there a pattern? Can you write a rule for finding common multiples?', tier: 5 },    ],
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

      { q: 'Explain the connection between multiplication and division using 7 × 8 = 56. Write two division facts that follow from it and explain why.', tier: 4 },
      { q: 'Find every number less than 100 that divides exactly by 3, 4, and 5. Explain how you know you have found them all.', tier: 5 },    ],
  },

  'basic-fractions': {
    label: 'Intro to Fractions',
    subject: 'maths', band: 'Grade 3–4', bandOrder: -3,
    prerequisites: ['times-tables'],
    nextSkills: ['fractions-equivalent', 'decimals-intro'],
    questions: [
      { q: 'What is ½ of 24? What is ¼ of 36?', tier: 1 },
      { q: 'Which is larger: 3/5 or 5/8? Show how you decided.', tier: 2 },
      { q: 'A pizza is cut into 8 slices. Tom eats 3/8, Sara eats 1/4. What fraction is left? Write it in its simplest form.', tier: 3 },

      { q: 'Explain why 1/3 is larger than 1/4, even though 4 > 3. Draw a diagram to support your explanation.', tier: 4 },
      { q: 'Between 0 and 1, list every fraction with a single-digit denominator. Order them. Which pair is closest together?', tier: 5 },    ],
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

      { q: 'Explain why 6/8 = 3/4. What operation do you apply to numerator and denominator, and why does it not change the value?', tier: 4 },
      { q: 'Between 1/2 and 3/4, how many fractions with single-digit denominators exist? List them all and explain your method.', tier: 5 },    ],
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

      { q: 'Explain why 0.1 + 0.2 does not equal exactly 0.3 on most calculators. What does this reveal about decimals and computing?', tier: 4 },
      { q: 'Using the digits 1, 2, 3, 4 and a decimal point exactly once each, make as many decimal numbers between 1 and 4 as possible. Order them.', tier: 5 },    ],
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

      { q: 'Explain why subtracting a negative is the same as adding a positive. Use a number line and a real-life context (e.g. temperature) to justify it.', tier: 4 },
      { q: 'Find all pairs of integers (including negatives) that multiply to give 12. Organise your findings. What patterns do you notice?', tier: 5 },    ],
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

      { q: 'Two rectangles have the same perimeter of 20 cm but different areas. Give two examples. What dimensions give the maximum area?', tier: 4 },
      { q: 'For rectangles with perimeter 24 cm, make a table of whole-number dimensions and their areas. Which has the maximum area and why?', tier: 5 },    ],
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

      { q: 'Explain why angles in a triangle always sum to 180°. Describe a paper-folding demonstration that shows this without any calculation.', tier: 4 },
      { q: 'How many diagonals does a polygon with n sides have? Make a table for n = 3 to 8, find the formula, and prove why it works.', tier: 5 },    ],
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

      { q: 'A class mean is 15. One student scored 30. Explain what happens to the mean, median and range. Which average is most affected and why?', tier: 4 },
      { q: 'Create a set of exactly 10 whole numbers where the mean is 10 but the median is 7. How many different solutions can you find?', tier: 5 },    ],
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

      { q: 'Explain how the signs of a coordinate pair tell you which quadrant the point is in. Give one example for each of the four quadrants.', tier: 4 },
      { q: 'How many squares can you draw with all four corners on integer coordinates between −3 and 3? Describe your method for finding them all.', tier: 5 },    ],
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

      { q: 'Explain the difference between an expression and an equation using examples. Why can you solve an equation but not simplify it to a single value?', tier: 4 },
      { q: 'Find all integer values of n such that 2n + 5 is between 10 and 25 inclusive. Show your working systematically.', tier: 5 },    ],
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

      { q: 'Explain why we use significant figures rather than decimal places for very large or very small numbers. Give one example of each.', tier: 4 },
      { q: 'Which 3-digit numbers read the same forwards and backwards? How many are there? Is there a formula?', tier: 5 },    ],
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

      { q: 'Explain why dividing by a fraction is the same as multiplying by its reciprocal. Use 3 ÷ 1/2 as a worked example.', tier: 4 },
      { q: 'Find three different fractions a/b, c/d, e/f in lowest terms where a/b + c/d + e/f = 1 and all denominators are different single digits.', tier: 5 },    ],
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

      { q: 'Explain the difference between a percentage change and a percentage point change. Give a real-world example where confusing them is misleading.', tier: 4 },
      { q: 'A price rises by x% then falls by x%. Show algebraically that it is never back to the original (unless x = 0). Find the net percentage change.', tier: 5 },    ],
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

      { q: 'Explain why 4:6 is equivalent to 2:3. What operation are you performing and why does it preserve the relationship?', tier: 4 },
      { q: 'Three siblings share pocket money in the ratio of their ages: 6, 9 and 15. Total is £60. How does each share change each year? When do the shares become equal?', tier: 5 },    ],
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

      { q: 'Explain why 3(x + 2) and 3x + 6 are equivalent. Name the algebraic law you are applying and explain why it works.', tier: 4 },
      { q: 'Find all integer pairs (x, y) where 2x + 3y = 24 and both x and y are positive. How many solutions exist?', tier: 5 },    ],
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

      { q: 'Explain each step when solving 2(x + 3) = 5x − 9. For each operation, state the rule that makes it valid.', tier: 4 },
      { q: 'Two numbers have a sum of 40 and a difference of 8. Set up and solve equations. Now investigate: for which positive differences does a whole-number solution exist?', tier: 5 },    ],
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

      { q: 'Explain why (x + 3)(x − 3) = x² − 9 and why the middle term disappears. What is this pattern called and when does it apply?', tier: 4 },
      { q: 'Without a calculator, find 99² using (100 − 1)². Generalise: derive a quick method for squaring any number near a round number.', tier: 5 },    ],
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

      { q: 'Explain why the inequality sign reverses when multiplying or dividing by a negative. Give a numerical example to prove it is necessary.', tier: 4 },
      { q: 'Make up a compound inequality that has exactly 5 integer solutions. Show your working and explain how you constructed it.', tier: 5 },    ],
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

      { q: 'Solve 2x + y = 7, x − y = 2 using BOTH elimination AND substitution. When is each method preferable? Explain.', tier: 4 },
      { q: 'Create three different pairs of simultaneous equations that all have solution x = 3, y = −1. Describe the pattern in your equations.', tier: 5 },    ],
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

      { q: 'Explain the connection between the factors of x² − 5x + 6 and the roots of x² − 5x + 6 = 0. Why do the roots have opposite signs to the bracket numbers?', tier: 4 },
      { q: 'Find all quadratics x² + bx + c that factorise over the integers where b and c are both positive single-digit integers. How many are there?', tier: 5 },    ],
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

      { q: 'Explain why completing the square on x² + 6x + 5 gives (x + 3)² − 4. Where does the −4 come from and what does it represent?', tier: 4 },
      { q: 'Use completing the square to prove that x² + bx + c ≥ 0 for all x only when b² ≤ 4c. Verify with two examples of your choice.', tier: 5 },    ],
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

      { q: 'Explain what each part of x = (−b ± √(b²−4ac)) / 2a means. Why are there two solutions, and what does ± represent?', tier: 4 },
      { q: 'Find a quadratic with roots 1 + √2 and 1 − √2. Show your method, then generalise: if roots are p ± √q, what is the general equation?', tier: 5 },    ],
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

      { q: 'Explain geometrically what b² − 4ac tells us about where the parabola y = ax² + bx + c sits relative to the x-axis.', tier: 4 },
      { q: 'Find all values of k for which kx² + 4x + k = 0 has real roots. Include k < 0 in your investigation. What happens at the boundary?', tier: 5 },    ],
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

      { q: 'Explain how to read the roots, vertex and y-intercept directly from y = (x − 2)² − 9 without expanding it. What advantage does vertex form give?', tier: 4 },
      { q: 'Parabolas y = x² and y = −x² + 4 intersect at two points. Find them, then calculate the area enclosed between the two curves.', tier: 5 },    ],
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

      { q: 'Explain why parallel lines have equal gradients and why perpendicular lines have gradients that multiply to −1. Use diagrams if it helps.', tier: 4 },
      { q: 'Triangle with vertices A(0,0), B(4,0), C(1,3). Find equations of all three altitudes and show they meet at one point (the orthocentre).', tier: 5 },    ],
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

      { q: 'Explain why sin(30°) = cos(60°). What does this reveal about the relationship between sine and cosine in general?', tier: 4 },
      { q: 'Without a calculator, find exact values for sin and cos of 0°, 30°, 45°, 60°, 90°. Show your working using right triangles. Why are these exact?', tier: 5 },    ],
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

      { q: 'Explain when to use the sine rule vs the cosine rule. Create a decision flowchart for choosing between them given different information.', tier: 4 },
      { q: 'A triangle has sides 5, 12, 13. Use the cosine rule to find all three angles, then confirm which angle is 90° and verify using Pythagoras.', tier: 5 },    ],
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

      { q: 'Explain why √2 is irrational. What does irrational mean, and why can we not write √2 as a fraction p/q?', tier: 4 },
      { q: 'Simplify (√3 + 1)/(√3 − 1) by rationalising. Then find the numerical value of (√3 + 1)⁴ without a calculator. Show your method.', tier: 5 },    ],
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

      { q: 'Derive tan²θ + 1 = sec²θ from sin²θ + cos²θ = 1. Explain each algebraic step and why it is valid.', tier: 4 },
      { q: 'Using the compound angle formulae for sin(A+B) and cos(A+B), derive a formula for tan(A+B). Verify it for A = B = 45°.', tier: 5 },    ],
  },

  'further-algebra': {
    label: 'Further Algebra',
    subject: 'maths', band: 'A-Level', bandOrder: 8,
    prerequisites: ['discriminant', 'surds'],
    nextSkills: ['calculus-intro', 'binomial-expansion'],
    questions: [
      { q: 'Simplify: (x² − 9) / (x² + x − 6)', tier: 1 },
      { q: 'Express (3x + 1) / ((x+1)(x−2)) in partial fractions.', tier: 2 },
      { q: 'Prove that n² + n is always even for any integer n.', tier: 3 },

      { q: 'Explain what partial fractions are and why they are useful in integration. Demonstrate by decomposing (2x + 3)/((x+1)(x+2)).', tier: 4 },
      { q: 'Prove that the product of any three consecutive integers is divisible by 6. Then investigate: is the product of four consecutive integers always divisible by 24?', tier: 5 },    ],
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

      { q: 'Explain what the derivative represents geometrically (as a gradient) and physically (as a rate of change). Give a real-world example of each.', tier: 4 },
      { q: 'Find all x where f(x) = x³ − 6x² + 9x + 1 is increasing. Sketch a rough graph. What is the connection between f(x) being increasing and the sign of f′(x)?', tier: 5 },    ],
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

      { q: 'Explain the difference between a definite and an indefinite integral. Why does one give a number and the other a function?', tier: 4 },
      { q: 'Find the value of a such that ∫₀ᵃ x² dx = ∫ₐ² x² dx. What does this value represent geometrically?', tier: 5 },    ],
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

      { q: 'Explain what a · b = 0 means geometrically. How do you use the dot product to test if two vectors are perpendicular?', tier: 4 },
      { q: 'Position vectors of A, B, C are a, b, c where a + b + c = 0. Prove the triangle ABC has a specific centroid and find the area in terms of |a × b|.', tier: 5 },    ],
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

      { q: 'Explain why log(ab) = log a + log b using the laws of indices. Start from aᵐ × aⁿ = aᵐ⁺ⁿ.', tier: 4 },
      { q: 'Solve simultaneously: log₂(x) + log₂(y) = 5 and log₂(x) − log₂(y) = 1. How many solutions exist? What changes if the right-hand sides differ?', tier: 5 },    ],
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

      { q: 'Explain where Pascal\'s triangle comes from and how it connects to the binomial coefficients ⁿCr. Why does each row start and end with 1?', tier: 4 },
      { q: 'Find the coefficient of x³ in (1 + x + x²)⁵. You cannot simply expand — explain your method clearly.', tier: 5 },    ],
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

      { q: 'Explain why the sum to infinity of a geometric series only exists when |r| < 1. What happens to the partial sums when r = 1 or r = −1?', tier: 4 },
      { q: 'The sequence aₙ₊₁ = aₙ² − aₙ with a₁ = 2. Find the first 5 terms. Does it converge? Investigate for a₁ = 0, 1, 2, 3.', tier: 5 },    ],
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

      { q: 'Explain the difference between proof by contradiction and disproof by counter-example. Why can one counter-example disprove a universal claim?', tier: 4 },
      { q: 'Prove there are infinitely many primes. Then use the structure of this proof to explain what makes a proof by contradiction valid in general.', tier: 5 },    ],
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

      { q: 'Explain geometrically using the unit circle why sin(π − x) = sin(x) and cos(π − x) = −cos(x).', tier: 4 },
      { q: 'Solve 4sin²x − 4sinx + 1 = 0 for 0 ≤ x ≤ 2π. Show all steps. How many solutions are there and why does the repeated root affect the count?', tier: 5 },    ],
  },

  'quadratic-simultaneous': {
    label: 'Quadratic Simultaneous Equations',
    subject: 'maths', band: 'GCSE Higher', bandOrder: 6,
    prerequisites: ['simultaneous-equations', 'quadratic-factorising'],
    nextSkills: ['discriminant'],
    questions: [
      { q: 'Solve simultaneously: y = x + 1 and y = x²− 1', tier: 1 },
      { q: 'Solve simultaneously: x² + y² = 25 and y = 2x', tier: 2 },
      { q: 'Find the x-coordinates where y = x² − 3x and y = x + 5 intersect. Give exact answers.', tier: 3 },
      { q: 'Explain why solving y = x + k and y = x² simultaneously gives a quadratic in x. What does the discriminant of that quadratic tell you about the number of intersections?', tier: 4 },
      { q: 'Show that the line y = mx + c intersects y = x² at two points when m² + 4c > 0. Find the coordinates of both points in terms of m and c.', tier: 5 },
    ],
  },

  'quadratic-inequalities': {
    label: 'Quadratic Inequalities',
    subject: 'maths', band: 'GCSE Higher', bandOrder: 6,
    prerequisites: ['inequalities', 'quadratic-factorising'],
    nextSkills: ['further-algebra'],
    questions: [
      { q: 'Solve: x² − 5x + 6 > 0', tier: 1 },
      { q: 'Solve: 2x² + x − 3 ≤ 0', tier: 2 },
      { q: 'Find the range of values of x for which x² < 3x + 10. Give your answer using inequality notation.', tier: 3 },
      { q: 'Explain why the solution to x² − 4 > 0 is two separate regions (x < −2 or x > 2) rather than one continuous range. Use a sketch to justify.', tier: 4 },
      { q: 'Solve x² + bx + c < 0 in terms of b and c, assuming two real roots α and β where α < β. State clearly when this is possible and when no solution exists.', tier: 5 },
    ],
  },

  'transformations': {
    label: 'Graph Transformations',
    subject: 'maths', band: 'GCSE Higher', bandOrder: 5,
    prerequisites: ['straight-line-graphs', 'quadratic-graphs'],
    nextSkills: ['trigonometry', 'further-trig'],
    questions: [
      { q: 'The graph of y = f(x) is translated 3 units right. Write the new equation.', tier: 1 },
      { q: 'Describe the transformation that maps y = x² to y = −(x + 2)²', tier: 2 },
      { q: 'The graph of y = sin(x) is stretched vertically by factor 3 and translated π/2 left. Write the equation of the new graph.', tier: 3 },
      { q: 'Explain why y = f(x + a) shifts the graph LEFT when a > 0, even though adding a feels like it should go right. Use a numerical example to prove it.', tier: 4 },
      { q: 'Starting from y = x², apply these transformations in order: reflect in x-axis, stretch horizontally by factor 2, translate (1, −3). Write the equation after each step and justify the order matters.', tier: 5 },
    ],
  },

  'calculus-applications': {
    label: 'Calculus Applications',
    subject: 'maths', band: 'A-Level', bandOrder: 9,
    prerequisites: ['calculus-intro', 'integration'],
    nextSkills: [],
    questions: [
      { q: 'A particle moves with displacement s = t³ − 6t² + 9t. Find its velocity at t = 2.', tier: 1 },
      { q: 'Find the minimum value of f(x) = x³ − 3x² + 4 and verify it is a minimum.', tier: 2 },
      { q: 'A rectangle has perimeter 20 cm. Use calculus to find the dimensions that maximise the area.', tier: 3 },
      { q: 'A particle has velocity v = 3t² − 12t + 9. Find when it is stationary, and determine whether these are maximum or minimum velocity points.', tier: 4 },
      { q: 'An open-top box is made from a 12 cm × 12 cm square card by cutting equal squares of side x from each corner. Find x that maximises volume. Show it is a maximum.', tier: 5 },
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

      { q: 'Explain why eliminating t converts parametric equations to a Cartesian equation of the same curve. What does t represent physically?', tier: 4 },
      { q: 'For x = t² + 1, y = t³ − t, find all points where the tangent is horizontal or vertical. Use these to sketch the shape of the curve.', tier: 5 },    ],
  },
}

// ─── PHYSICS ──────────────────────────────────────────────────────────────────
const PHYSICS = {

  // ── PRIMARY (Grade 3–6 / Year 3–6) ─────────────────────────────────────────

  'pushes-pulls': {
    label: 'Pushes, Pulls & Friction',
    subject: 'physics', band: 'Grade 3–4', bandOrder: -4,
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
    subject: 'physics', band: 'Grade 5–6', bandOrder: -2,
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

  'simple-harmonic': {
    label: 'Simple Harmonic Motion',
    subject: 'physics', band: 'A-Level', bandOrder: 8,
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
    subject: 'physics', band: 'GCSE Higher', bandOrder: 4,
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
    subject: 'physics', band: 'A-Level', bandOrder: 7,
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
    subject: 'physics', band: 'A-Level', bandOrder: 7,
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
    subject: 'physics', band: 'GCSE Higher', bandOrder: 5,
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
    subject: 'physics', band: 'A-Level', bandOrder: 8,
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
    subject: 'chemistry', band: 'Grade 3–4', bandOrder: -4,
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
    subject: 'chemistry', band: 'Grade 5–6', bandOrder: -2,
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

  'structure-properties': {
    label: 'Structure & Properties',
    subject: 'chemistry', band: 'GCSE Higher', bandOrder: 4,
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
    subject: 'chemistry', band: 'GCSE Higher', bandOrder: 4,
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

  // ── PRIMARY ─────────────────────────────────────────────────────────────────

  'living-things': {
    label: 'Living Things & Life Processes',
    subject: 'biology', band: 'Grade 3–4', bandOrder: -4,
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
    subject: 'biology', band: 'Grade 5–6', bandOrder: -2,
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

  'breathing': {
    label: 'Breathing & Gas Exchange',
    subject: 'biology', band: 'GCSE Foundation', bandOrder: 2,
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
    subject: 'biology', band: 'GCSE Foundation', bandOrder: 3,
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
    subject: 'biology', band: 'GCSE Higher', bandOrder: 6,
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

  'ww1-trench': {
    label: 'WW1 — Trench Warfare',
    subject: 'history', band: 'GCSE', bandOrder: 4,
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
    subject: 'history', band: 'GCSE', bandOrder: 5,
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
    subject: 'history', band: 'GCSE', bandOrder: 5,
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

  'firms-revenue': {
    label: 'Firms, Costs & Revenue',
    subject: 'economics', band: 'GCSE Higher', bandOrder: 4,
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
    subject: 'economics', band: 'GCSE Higher', bandOrder: 5,
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
    subject: 'economics', band: 'GCSE Higher', bandOrder: 6,
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

  // ── PRIMARY ─────────────────────────────────────────────────────────────────

  'what-is-computing': {
    label: 'What is Computing?',
    subject: 'computer-science', band: 'Grade 3–4', bandOrder: -4,
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
    subject: 'computer-science', band: 'Grade 5–6', bandOrder: -2,
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

  'data-structures': {
    label: 'Data Structures',
    subject: 'computer-science', band: 'GCSE Foundation', bandOrder: 2,
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
    subject: 'computer-science', band: 'GCSE Higher', bandOrder: 5,
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
    subject: 'computer-science', band: 'GCSE Higher', bandOrder: 6,
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
    subject: 'computer-science', band: 'A-Level', bandOrder: 7,
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
}

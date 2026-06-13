// utils/aiMatcher.js
// ─────────────────────────────────────────────────────────────
//  AI Internship Recommendation Engine
//  Multi-factor scoring algorithm:
//    - Skill match     : 40 pts  (technical skills overlap)
//    - Domain match    : 25 pts  (preferred domain alignment)
//    - Academic score  : 20 pts  (CGPA vs minimum requirement)
//    - Interest match  : 15 pts  (areas of interest vs domain)
//  Total: 100 pts
// ─────────────────────────────────────────────────────────────

/**
 * Normalize a string array or comma-separated string into
 * lowercase trimmed tokens.
 */
function toTokens(input) {
  if (!input) return [];
  if (Array.isArray(input)) return input.map(s => s.toLowerCase().trim()).filter(Boolean);
  return input.split(',').map(s => s.toLowerCase().trim()).filter(Boolean);
}

/**
 * Check if two token lists share at least one similar token.
 * Uses simple substring matching (e.g. "react" matches "reactjs").
 */
function tokenOverlap(listA, listB) {
  if (!listA.length || !listB.length) return 0;
  let matched = 0;
  for (const a of listA) {
    if (listB.some(b => b.includes(a) || a.includes(b))) matched++;
  }
  return matched;
}

/**
 * Calculate the AI match score between a student and an internship.
 * Returns an object: { total, breakdown }
 *
 * @param {Object} student    - Mongoose student document (or plain object)
 * @param {Object} internship - Mongoose internship document (or plain object)
 * @returns {{ total: number, breakdown: Object }}
 */
function calcMatchScore(student, internship) {
  let skillScore    = 0;
  let domainScore   = 0;
  let cgpaScore     = 0;
  let interestScore = 0;

  // ── 1. Skill match (40 pts) ──────────────────────────────────
  const studentSkills  = toTokens(student.technicalSkills);
  const requiredSkills = toTokens(internship.requiredSkills);

  if (requiredSkills.length > 0 && studentSkills.length > 0) {
    const matched = tokenOverlap(requiredSkills, studentSkills);
    skillScore = Math.round((matched / requiredSkills.length) * 40);
  } else if (studentSkills.length > 0) {
    skillScore = 20; // partial credit if no requirements specified
  }

  // ── 2. Domain match (25 pts) ─────────────────────────────────
  const prefDomain  = (student.preferredDomain || '').toLowerCase();
  const intDomain   = (internship.domain || '').toLowerCase();

  if (prefDomain && intDomain) {
    if (prefDomain === intDomain) {
      domainScore = 25;
    } else {
      // Partial: check word overlap (e.g. "AI" in "Artificial Intelligence")
      const prefWords = prefDomain.split(/\s+/);
      const intWords  = intDomain.split(/\s+/);
      const wordHit   = prefWords.some(w => intWords.includes(w));
      domainScore = wordHit ? 12 : 0;
    }
  }

  // ── 3. Academic / CGPA match (20 pts) ────────────────────────
  const studentCgpa = parseFloat(student.cgpa) || 0;
  const minCgpa     = parseFloat(internship.minCgpa) || 0;

  if (studentCgpa >= minCgpa) {
    // Bonus for higher CGPA above minimum
    const surplus = studentCgpa - minCgpa;
    cgpaScore = Math.min(20, 15 + Math.round(surplus * 2));
  } else {
    // Partial if slightly below (within 0.5)
    const gap = minCgpa - studentCgpa;
    if (gap <= 0.5) cgpaScore = 8;
  }

  // ── 4. Interest match (15 pts) ───────────────────────────────
  const interests   = toTokens(student.areasOfInterest);
  const domainWords = intDomain.split(/\s+/).filter(w => w.length > 2);
  const certWords   = toTokens(student.certifications).join(' ').split(/\s+/);

  if (interests.length > 0 && domainWords.length > 0) {
    const interestHit = interests.some(i =>
      domainWords.some(d => i.includes(d) || d.includes(i))
    );
    if (interestHit) interestScore += 10;
  }
  // Extra: certifications relevant to domain
  const certHit = certWords.some(c =>
    domainWords.some(d => c.includes(d) || d.includes(c))
  );
  if (certHit) interestScore += 5;
  interestScore = Math.min(15, interestScore);

  const total = Math.min(100, skillScore + domainScore + cgpaScore + interestScore);

  return {
    total,
    breakdown: {
      skillScore,
      domainScore,
      cgpaScore,
      interestScore,
    },
  };
}

/**
 * Generate ranked recommendations for a single student
 * against a list of internships.
 *
 * @param {Object}   student      - student document
 * @param {Object[]} internships  - array of internship documents
 * @param {number}   topN         - how many results to return
 * @returns {Object[]} - sorted array with matchScore & breakdown
 */
function getRecommendations(student, internships, topN = 10) {
  const scored = internships
    .filter(i => i.isActive !== false)
    .map(i => {
      const { total, breakdown } = calcMatchScore(student, i);
      return {
        internship:  i,
        matchScore:  total,
        breakdown,
        label:
          total >= 80 ? 'Excellent Match' :
          total >= 60 ? 'Good Match'      :
          total >= 40 ? 'Fair Match'      : 'Low Match',
      };
    })
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, topN);

  return scored;
}

/**
 * Bulk: for each student, find their single best match.
 * Used by admin allocation overview.
 *
 * @param {Object[]} students
 * @param {Object[]} internships
 * @returns {Object[]}
 */
function getBulkBestMatches(students, internships) {
  return students.map(s => {
    const recs = getRecommendations(s, internships, 1);
    return {
      student:      s,
      bestMatch:    recs[0]?.internship  || null,
      bestScore:    recs[0]?.matchScore  || 0,
      breakdown:    recs[0]?.breakdown   || {},
    };
  });
}

module.exports = { calcMatchScore, getRecommendations, getBulkBestMatches };
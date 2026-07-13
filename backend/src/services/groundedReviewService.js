function reviewGroundedGeneration(validation,retrieval){const issues=[...validation.issues];if((retrieval.results||[]).length===0)issues.push({type:"insufficient_evidence"});return{approved:issues.length===0,issues,coverage:validation.coverage,confidence:issues.length?"insufficient":retrieval.confidence};}
module.exports={reviewGroundedGeneration};

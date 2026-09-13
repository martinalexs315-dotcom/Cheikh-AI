const error = new Error('{"error":{"message":"{\\n  \\"error\\": {\\n    \\"code\\": 503,\\n    \\"message\\": \\"This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later.\\",\\n    \\"status\\": \\"UNAVAILABLE\\"\\n  }\\n}\\n","code":503,"status":"Service Unavailable"}}');

function isRetryableError(error) {
  const status = error?.status;
  const message = error?.message?.toLowerCase() || '';
  if (status === 429 || status === 503) return true;
  if (
    message.includes('quota') || 
    message.includes('rate limit') || 
    message.includes('exhausted') || 
    message.includes('overloaded') ||
    message.includes('unavailable')
  ) {
    return true;
  }
  return false;
}

console.log(isRetryableError(error));

// Customer-safe reply cleaner: drops stage notes the model sometimes writes ("(no reply needed)")
// and swaps em/en dashes for plain punctuation. Keeps WhatsApp *bold* and normal text untouched.
const META = /\b(no\s+(reply|response|message)\s+(is\s+)?(needed|required|necessary)|empty\s+(reply|message|response)|stay(ing)?\s+silent|do\s+not\s+reply|don'?t\s+reply|nothing\s+(more\s+)?to\s+(say|reply|send|add)|skip(ping)?\s+(the\s+)?(reply|this)|internal\s+note|note\s+to\s+self|stage\s*:)/i;

export function cleanCustomerReply(t) {
  let x = String(t || '');
  x = x.replace(/[(\[]([^()\[\]\n]{0,160})[)\]]/g, (m, inner) => (META.test(inner) ? '' : m));
  x = x.split('\n').filter((l) => {
    const s = l.trim().replace(/^[*_~]+|[*_~.!]+$/g, '');
    return !(META.test(s) && s.length <= 40);
  }).join('\n');
  x = x.replace(/(\d)\s*[–—]\s*(\d)/g, '$1-$2')
    .replace(/^([ \t]*)[–—][ \t]*/gm, '$1- ')
    .replace(/[ \t]*[—–][ \t]*/g, ', ')
    .replace(/,\s*,/g, ',').replace(/,\s*([.!?])/g, '$1')
    .replace(/([^\n ]) {2,}/g, '$1 ').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n');
  return x.trim();
}

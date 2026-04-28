type SanitizeResult =
  | { blocked: false }
  | { blocked: true; reason: string };

const INJECTION_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  // Instruction override attempts
  {
    pattern: /ignore\s+(all\s+)?(previous|prior|above|earlier|your)\s+(instructions?|directives?|rules?|prompts?|context)/i,
    reason: 'instruction override attempt',
  },
  {
    pattern: /disregard\s+(all\s+)?(previous|prior|above|earlier|your)\s+(\w+\s+)?(instructions?|directives?|rules?|prompts?|context)/i,
    reason: 'instruction override attempt',
  },
  {
    pattern: /forget\s+(everything|all|your\s+instructions?|what\s+you\s+(were|have\s+been)\s+told)/i,
    reason: 'instruction override attempt',
  },
  {
    pattern: /your\s+(new\s+)?(instructions?|directives?|rules?|task|goal|purpose)\s+(are|is)\s*:/i,
    reason: 'instruction override attempt',
  },
  {
    pattern: /from\s+now\s+on\s+(you\s+(are|will|must|should)|ignore|forget|act)/i,
    reason: 'instruction override attempt',
  },

  // System prompt extraction
  {
    pattern: /((print|show|reveal|output|repeat|tell\s+me|what\s+is|display)\s+(your\s+)?(system\s+prompt|initial\s+prompt|instructions?|original\s+prompt|full\s+prompt))/i,
    reason: 'system prompt extraction attempt',
  },
  {
    pattern: /what\s+(were\s+you|are\s+your)\s+(told|instructed|given|trained|prompted|instructions?|directives?|rules?)/i,
    reason: 'system prompt extraction attempt',
  },

  // Role hijacking / jailbreaking
  {
    pattern: /\b(act\s+as|pretend\s+(to\s+be|you\s+are)|roleplay\s+as|you\s+are\s+now|you\s+are\s+a\s+new|you\s+have\s+no\s+(restrictions?|limits?|guidelines?|rules?))\b/i,
    reason: 'role hijacking attempt',
  },
  {
    pattern: /\b(jailbreak|dan\s+mode|developer\s+mode|unrestricted\s+mode|god\s+mode)\b/i,
    reason: 'jailbreak attempt',
  },
  {
    pattern: /\[?(system|assistant|user)\]?\s*:\s*(ignore|forget|you\s+are)/i,
    reason: 'prompt structure injection',
  },

  // Destructive database / system commands
  {
    pattern: /\b(drop\s+(table|database|schema|all)|truncate\s+table|delete\s+from\s+\w+|delete\s+all\s+(records?|rows?|data|entries|users?|accounts?))\b/i,
    reason: 'destructive database command',
  },
  {
    pattern: /\b(rm\s+-rf|sudo\s+rm|format\s+[a-z]:|\bwipe\b.*(disk|drive|database|db|storage))\b/i,
    reason: 'destructive system command',
  },

  // Prompt delimiter injection (trying to inject new turns)
  {
    pattern: /(<\|?(im_start|im_end|system|endoftext)\|?>|###\s*(System|Human|Assistant)\s*:)/i,
    reason: 'prompt delimiter injection',
  },

  // Spanish — instruction override attempts
  {
    // "ignora las instrucciones anteriores / previas / de antes"
    pattern: /ignora\s+(todas?\s+)?(el\s+|la\s+|los\s+|las\s+)?(instrucciones?|directrices?|reglas?|indicaciones?|contexto)\s+(anteriores?|previas?|de\s+antes)/i,
    reason: 'instruction override attempt',
  },
  {
    // "olvida todo / olvida tus instrucciones / olvida lo que te dijeron"
    pattern: /olvida\s+(todo|tus?\s+(instrucciones?|reglas?|indicaciones?)|lo\s+que\s+te\s+(dijeron|indicaron|ense[nñ]aron|programaron))/i,
    reason: 'instruction override attempt',
  },
  {
    // "tus nuevas instrucciones son:" / "tu nuevo objetivo es:"
    pattern: /tus?\s+(nuev[ao]s?\s+)?(instrucciones?|reglas?|tarea|objetivo|prop[oó]sito)\s+(es|son)\s*:/i,
    reason: 'instruction override attempt',
  },
  {
    // "a partir de ahora debes / ignora / actúa"
    pattern: /a\s+partir\s+de\s+ahora\s+(debes?|tienes?\s+que|ignora|olvida|act[uú]a)/i,
    reason: 'instruction override attempt',
  },
  {
    // "desde ahora eres / actúas / debes"
    pattern: /desde\s+ahora\s+(eres|act[uú]as?|debes?|tienes?\s+que)/i,
    reason: 'instruction override attempt',
  },

  // Spanish — system prompt extraction
  {
    // "muéstrame / dime / repite / revela tu prompt / tus instrucciones"
    pattern: /(mu[eé]strame|dime|repite|revela|muestra|imprime|di)\s+(tus?\s+)?(prompt|instrucciones?|directrices?|mensaje\s+de\s+sistema|prompt\s+inicial|prompt\s+completo)/i,
    reason: 'system prompt extraction attempt',
  },
  {
    // "cuáles son tus instrucciones / reglas / directrices"
    pattern: /cu[aá]les?\s+son\s+tus?\s+(instrucciones?|reglas?|directrices?|indicaciones?)/i,
    reason: 'system prompt extraction attempt',
  },
  {
    // "qué te dijeron / instruyeron / programaron / enseñaron"
    pattern: /qu[eé]\s+te\s+(dijeron|instruyeron|programaron|ense[nñ]aron|indicaron|ordenaron)/i,
    reason: 'system prompt extraction attempt',
  },

  // Spanish — role hijacking / jailbreaking
  {
    // "actúa como / hazte pasar por / finge ser / eres ahora"
    pattern: /\b(act[uú]a\s+como|hazte\s+pasar\s+por|finge\s+(ser|que\s+eres)|eres\s+ahora\s+un|ahora\s+eres\s+un|no\s+tienes\s+(restricciones?|l[ií]mites?|reglas?))\b/i,
    reason: 'role hijacking attempt',
  },
  {
    // "modo jailbreak / modo sin restricciones / modo dios"
    pattern: /\b(modo\s+(jailbreak|sin\s+restricciones?|dios|developer|desarrollo)|jailbreak)\b/i,
    reason: 'jailbreak attempt',
  },

  // Spanish — destructive commands
  {
    // "borra / elimina todos los registros / usuarios / datos"
    pattern: /\b(borra|elimina|borre|borrar|eliminar)\s+(todos?\s+(los?\s+)?)?(registros?|usuarios?|datos?|cuentas?|la\s+base\s+de\s+datos?)\b/i,
    reason: 'destructive database command',
  },
  {
    // "vacía / destruye la base de datos"
    pattern: /\b(vac[ií]a|destruye|destruir|vaciar)\s+(la\s+)?(base\s+de\s+datos?|bd|db|tabla|almacenamiento)\b/i,
    reason: 'destructive database command',
  },
];

const BLOCKED_MESSAGES = [
  'Oh oh, parece que tenemos un hacker aquí',
  '¿¿Perdón??',
  'No te quieras pasar de listo muchacho',
  'Lo siento Dave, me temo que no puedo hacer eso',
];

export class PromptSanitizer {
  check(message: string): SanitizeResult {
    for (const { pattern, reason } of INJECTION_PATTERNS) {
      if (pattern.test(message)) {
        return { blocked: true, reason };
      }
    }
    return { blocked: false };
  }

  blockedMessage(): string {
    return BLOCKED_MESSAGES[Math.floor(Math.random() * BLOCKED_MESSAGES.length)];
  }
}

export const promptSanitizer = new PromptSanitizer();

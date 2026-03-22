const amountPattern1 = /(?:rs\.?\s*|lkr\s*|₨\s*)?\b(\d[\d,]*(?:\.\d{1,2})?)\s*(k\b|rupees?|rs|lkr|bucks?)?(?!\s*,?\s*(?:st|nd|rd|th|january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)\b)/gi;

const amountPattern2 = /(?:rs\.?\s*|lkr\s*|₨\s*)?\b(\d[\d,]*(?:\.\d{1,2})?)(?!\d)\s*(k\b|rupees?|rs|lkr|bucks?)?(?!\s*,?\s*(?:st|nd|rd|th|january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)\b)/gi;

const msg = 'change salary to 15th march';
console.log('Without (?!\\d):', amountPattern1.exec(msg));
console.log('With (?!\\d):', amountPattern2.exec(msg));

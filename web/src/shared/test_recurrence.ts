import { extractEntities } from './local-ai';

interface TestCase {
    phrase: string;
    expected: {
        amount?: number;
        currency?: string;
        frequency?: string;
        interval?: number;
        dom?: number;
        dow?: number;
        note?: string;
        type?: 'income' | 'expense';
    };
}

const testCases: TestCase[] = [
    // 1. Simple Frequencies
    { phrase: "add gym daily 50", expected: { amount: 50, frequency: "daily", note: "Gym" } },
    { phrase: "record netflix monthly 15", expected: { amount: 15, frequency: "monthly", note: "Netflix" } },
    { phrase: "add insurance yearly 1200", expected: { amount: 1200, frequency: "yearly", note: "Insurance" } },
    { phrase: "weekly groceries 200", expected: { amount: 200, frequency: "weekly", note: "Groceries" } },
    { phrase: "salary monthly 5000", expected: { amount: 5000, frequency: "monthly", note: "Salary", type: 'income' } },

    // 2. Interval-based (Tricky: 2 vs amount)
    { phrase: "gym every 2 weeks 50", expected: { amount: 50, frequency: "weekly", interval: 2, note: "Gym" } },
    { phrase: "water every 3 months 100", expected: { amount: 100, frequency: "monthly", interval: 3, note: "Water" } },
    { phrase: "meds every 5 days 20", expected: { amount: 20, frequency: "daily", interval: 5, note: "Meds" } },
    { phrase: "savings every 2 months 1000", expected: { amount: 1000, frequency: "monthly", interval: 2, note: "Savings" } },
    { phrase: "mowing every 4 weeks 150", expected: { amount: 150, frequency: "weekly", interval: 4, note: "Mowing" } },

    // 3. Specific Day (DOM)
    { phrase: "rent on the 1st of every month 2500", expected: { amount: 2500, frequency: "monthly", dom: 1, note: "Rent" } },
    { phrase: "netflix on the 23rd 15", expected: { amount: 15, frequency: "monthly", dom: 23, note: "Netflix" } },
    { phrase: "spotify every 15th 10", expected: { amount: 10, frequency: "monthly", dom: 15, note: "Spotify" } },
    { phrase: "electricity on the 10th of each month 80", expected: { amount: 80, frequency: "monthly", dom: 10, note: "Electricity" } },
    { phrase: "subscription on the 31st 50", expected: { amount: 50, frequency: "monthly", dom: 31, note: "Subscription" } },

    // 4. Specific Day (DOW)
    { phrase: "yoga every Monday 30", expected: { amount: 30, frequency: "weekly", dow: 1, note: "Yoga" } },
    { phrase: "cleaner every Friday 60", expected: { amount: 60, frequency: "weekly", dow: 5, note: "Cleaner" } },
    { phrase: "church every Sunday 10", expected: { amount: 10, frequency: "weekly", dow: 0, note: "Church" } },
    { phrase: "badminton every Tuesday 15", expected: { amount: 15, frequency: "weekly", dow: 2, note: "Badminton" } },
    { phrase: "date night every Saturday 100", expected: { amount: 100, frequency: "weekly", dow: 6, note: "Date night" } },

    // 5. Amount/Currency Variations (Tricky: Currencies as suffix/prefix)
    { phrase: "USD 50 every month for VPN", expected: { amount: 50, currency: "USD", frequency: "monthly", note: "Vpn" } },
    { phrase: "rs. 500 daily for lunch", expected: { amount: 500, currency: "LKR", frequency: "daily", note: "Lunch" } },
    { phrase: "250 euro every 2 weeks for travel", expected: { amount: 250, currency: "EUR", frequency: "weekly", interval: 2, note: "Travel" } },
    { phrase: "10k monthly for rent", expected: { amount: 10000, frequency: "monthly", note: "Rent" } },
    { phrase: "$100 monthly savings", expected: { amount: 100, currency: "USD", frequency: "monthly", note: "Savings" } },

    // 6. Complex/Hidden Note
    { phrase: "add a monthly expense for my home insurance which is 450", expected: { amount: 450, frequency: "monthly", note: "Home insurance" } },
    { phrase: "record an income of 5000 rs every month from consulting", expected: { amount: 5000, currency: "LKR", frequency: "monthly", type: 'income', note: "Consulting" } },
    { phrase: "every 2 weeks I spend 150 on the gym facility", expected: { amount: 150, frequency: "weekly", interval: 2, note: "Gym facility" } },
    { phrase: "on the 5th of each month pay the internet bill for 50 USD", expected: { amount: 50, currency: "USD", frequency: "monthly", dom: 5, note: "Internet bill" } },
    { phrase: "save 100 bucks every month for the vacation fund", expected: { amount: 100, frequency: "monthly", note: "Vacation fund" } },

    // 7. Incomes (Keyword detection)
    { phrase: "monthly salary of 7000", expected: { amount: 7000, frequency: "monthly", type: 'income', note: "Salary" } },
    { phrase: "freelance payout every 2 weeks for 500", expected: { amount: 500, frequency: "weekly", interval: 2, type: 'income', note: "Freelance payout" } },
    { phrase: "bonus every year 2000", expected: { amount: 2000, frequency: "yearly", type: 'income', note: "Bonus" } },
    { phrase: "dividends every 3 months 150", expected: { amount: 150, frequency: "monthly", interval: 3, type: 'income', note: "Dividends" } },
    { phrase: "rental income monthly 1500", expected: { amount: 1500, frequency: "monthly", type: 'income', note: "Rental income" } },

    // 8. Edges/Noise
    { phrase: "daily coffee 5", expected: { amount: 5, frequency: "daily", note: "Coffee" } },
    { phrase: "weekly train pass 40", expected: { amount: 40, frequency: "weekly", note: "Train pass" } },
    { phrase: "monthly hosting 10", expected: { amount: 10, frequency: "monthly", note: "Hosting" } },
    { phrase: "yearly car tax 300", expected: { amount: 300, frequency: "yearly", note: "Car tax" } },
    { phrase: "every month on the 20th vpn 5", expected: { amount: 5, frequency: "monthly", dom: 20, note: "Vpn" } },

    // 9. Mixed Phrasing
    { phrase: "I want to track an every 2 weeks expense of 100 for my gardener", expected: { amount: 100, frequency: "weekly", interval: 2, note: "Gardener" } },
    { phrase: "Please record $50 every week for my swimming class", expected: { amount: 50, currency: "USD", frequency: "weekly", note: "Swimming class" } },
    { phrase: "On the 25th of every month Charge 20 for Apple Music", expected: { amount: 20, frequency: "monthly", dom: 25, note: "Apple music" } },
    { phrase: "Every 6 months pay 300 for Car Insurance", expected: { amount: 300, frequency: "monthly", interval: 6, note: "Car insurance" } },
    { phrase: "Add a recurring transaction of 150 every month for the gym", expected: { amount: 150, frequency: "monthly", note: "Gym" } },

    // 10. Trick Phrases
    { phrase: "my 2 kids gym every 2 weeks 150", expected: { amount: 150, frequency: "weekly", interval: 2, note: "My 2 kids gym" } },
    { phrase: "on the 10th pay 10 for vpn", expected: { amount: 10, frequency: "monthly", dom: 10, note: "Vpn" } },
    { phrase: "every 5 months pay for 5 users 50", expected: { amount: 50, frequency: "monthly", interval: 5, note: "For 5 users" } },
    { phrase: "daily spend about 15bucks on lunch", expected: { amount: 15, frequency: "daily", note: "Lunch" } },
    { phrase: "monthly rent is due on the 5th for LKR 65000", expected: { amount: 65000, currency: "LKR", frequency: "monthly", dom: 5, note: "Rent is due" } }
];

function runTests() {
    console.log(`\n--- Running 50+ Recurrence Extraction Tests ---\n`);
    let passed = 0;
    let failedCases: string[] = [];

    testCases.forEach((tc, i) => {
        const result = extractEntities(tc.phrase);
        const issues: string[] = [];

        if (tc.expected.amount !== undefined && result.amount !== tc.expected.amount) issues.push(`Amount: got ${result.amount}, want ${tc.expected.amount}`);
        if (tc.expected.currency && result.currency !== tc.expected.currency) issues.push(`Currency: got ${result.currency}, want ${tc.expected.currency}`);
        if (tc.expected.frequency && result.frequency !== tc.expected.frequency) issues.push(`Freq: got ${result.frequency}, want ${tc.expected.frequency}`);
        if (tc.expected.interval && result.interval !== tc.expected.interval) issues.push(`Interval: got ${result.interval}, want ${tc.expected.interval}`);
        if (tc.expected.dom && result.day_of_month !== tc.expected.dom) issues.push(`DOM: got ${result.day_of_month}, want ${tc.expected.dom}`);
        if (tc.expected.dow !== undefined && result.day_of_week !== tc.expected.dow) issues.push(`DOW: got ${result.day_of_week}, want ${tc.expected.dow}`);
        
        // Note check is loose (case insensitive and contains)
        if (tc.expected.note && (!result.note || !result.note.toLowerCase().includes(tc.expected.note.toLowerCase()))) {
            issues.push(`Note: got "${result.note}", want containing "${tc.expected.note}"`);
        }

        if (issues.length === 0) {
            passed++;
            console.log(`[PASS] ${i+1}. "${tc.phrase}"`);
        } else {
            console.log(`[FAIL] ${i+1}. "${tc.phrase}"`);
            issues.forEach(iss => console.log(`      - ${iss}`));
            failedCases.push(tc.phrase);
        }
    });

    console.log(`\n--- Final Result: ${passed}/${testCases.length} Passed ---\n`);
    if (failedCases.length > 0) {
        process.exit(1);
    }
}

runTests();

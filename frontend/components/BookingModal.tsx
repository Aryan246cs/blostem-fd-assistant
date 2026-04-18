"use client";

import { useState } from "react";

type Mode = "app" | "bank";
type Language = "english" | "hindi" | "tamil" | "marathi" | "bengali";

// ── Icons ──────────────────────────────────────────────────────────────────
const icons = {
  amount: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  ),
  calendar: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  target: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
    </svg>
  ),
  compare: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" />
    </svg>
  ),
  user: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  ),
  check: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  login: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><polyline points="10 17 15 12 10 7" /><line x1="15" y1="12" x2="3" y2="12" />
    </svg>
  ),
  bank: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="22" x2="21" y2="22" /><line x1="6" y1="18" x2="6" y2="11" /><line x1="10" y1="18" x2="10" y2="11" /><line x1="14" y1="18" x2="14" y2="11" /><line x1="18" y1="18" x2="18" y2="11" /><polygon points="12 2 20 7 4 7" />
    </svg>
  ),
  form: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  ),
  review: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
    </svg>
  ),
  shield: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  payment: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  ),
};

// ── App Guide Steps ────────────────────────────────────────────────────────
const APP_STEPS: Record<Language, { icon: JSX.Element; title: string; desc: string; tag: string; highlight?: boolean }[]> = {
  english: [
    { icon: icons.amount, title: "Enter Investment Amount", desc: "Choose how much you want to invest — ₹10,000, ₹50,000, ₹1,00,000 or a custom amount. This becomes your principal.", tag: "Step 1" },
    { icon: icons.calendar, title: "Select Tenure", desc: "Pick how long you want to keep your money invested — 6 months, 1 year, 2 years, or 5 years. Longer tenure usually means higher returns.", tag: "Step 2" },
    { icon: icons.target, title: "Choose Your Goal", desc: "Safe savings, high returns, monthly income, or tax saving (80C). This helps us recommend the best FD for you.", tag: "Step 3" },
    { icon: icons.compare, title: "Compare & Select Bank", desc: 'View top FD options ranked for you — see interest rate, maturity amount, and comparison insights. Click "Proceed with this FD".', tag: "Step 4" },
    { icon: icons.user, title: "Enter Basic Details", desc: "Provide your name and PAN number. Amount and tenure are pre-filled from your earlier choices.", tag: "Step 5" },
    { icon: icons.check, title: "FD Created (Simulation)", desc: 'Your FD is successfully "booked". You can see the maturity amount and total returns at a glance.', tag: "Done 🎉", highlight: true },
  ],
  hindi: [
    { icon: icons.amount, title: "निवेश राशि दर्ज करें", desc: "चुनें कि आप कितना निवेश करना चाहते हैं — ₹10,000, ₹50,000, ₹1,00,000 या कस्टम राशि। यही आपका मूलधन बनेगा।", tag: "चरण 1" },
    { icon: icons.calendar, title: "अवधि चुनें", desc: "तय करें कि आप कितने समय के लिए पैसा लगाना चाहते हैं — 6 महीने, 1 साल, 2 साल या 5 साल। लंबी अवधि में आमतौर पर ज़्यादा रिटर्न मिलता है।", tag: "चरण 2" },
    { icon: icons.target, title: "अपना लक्ष्य चुनें", desc: "सुरक्षित बचत, अधिक रिटर्न, मासिक आय या टैक्स बचत (80C)। इससे हम आपके लिए सबसे अच्छा FD सुझाते हैं।", tag: "चरण 3" },
    { icon: icons.compare, title: "बैंक की तुलना करें और चुनें", desc: 'आपके लिए रैंक किए गए शीर्ष FD विकल्प देखें — ब्याज दर, परिपक्वता राशि और तुलना देखें। "इस FD के साथ आगे बढ़ें" पर क्लिक करें।', tag: "चरण 4" },
    { icon: icons.user, title: "बुनियादी जानकारी दर्ज करें", desc: "अपना नाम और PAN नंबर दें। राशि और अवधि पहले से भरी होगी।", tag: "चरण 5" },
    { icon: icons.check, title: "FD बन गई (सिमुलेशन)", desc: 'आपकी FD सफलतापूर्वक "बुक" हो गई। परिपक्वता राशि और कुल रिटर्न एक नज़र में देखें।', tag: "हो गया 🎉", highlight: true },
  ],
  tamil: [
    { icon: icons.amount, title: "முதலீட்டு தொகையை உள்ளிடுங்கள்", desc: "நீங்கள் முதலீடு செய்ய விரும்பும் தொகையை தேர்வு செய்யுங்கள் — ₹10,000, ₹50,000, ₹1,00,000 அல்லது தனிப்பயன் தொகை.", tag: "படி 1" },
    { icon: icons.calendar, title: "காலத்தை தேர்வு செய்யுங்கள்", desc: "6 மாதங்கள், 1 வருடம், 2 வருடங்கள் அல்லது 5 வருடங்கள் — நீண்ட காலம் பொதுவாக அதிக வருமானம் தரும்.", tag: "படி 2" },
    { icon: icons.target, title: "உங்கள் இலக்கை தேர்வு செய்யுங்கள்", desc: "பாதுகாப்பான சேமிப்பு, அதிக வருமானம், மாதாந்திர வருமானம் அல்லது வரி சேமிப்பு (80C).", tag: "படி 3" },
    { icon: icons.compare, title: "வங்கியை ஒப்பிட்டு தேர்வு செய்யுங்கள்", desc: '"இந்த FD-யுடன் தொடரவும்" என்பதை கிளிக் செய்யுங்கள்.', tag: "படி 4" },
    { icon: icons.user, title: "அடிப்படை விவரங்களை உள்ளிடுங்கள்", desc: "உங்கள் பெயர் மற்றும் PAN எண்ணை வழங்குங்கள்.", tag: "படி 5" },
    { icon: icons.check, title: "FD உருவாக்கப்பட்டது (சிமுலேஷன்)", desc: "உங்கள் FD வெற்றிகரமாக பதிவு செய்யப்பட்டது.", tag: "முடிந்தது 🎉", highlight: true },
  ],
  marathi: [
    { icon: icons.amount, title: "गुंतवणूक रक्कम प्रविष्ट करा", desc: "तुम्हाला किती गुंतवायचे ते निवडा — ₹10,000, ₹50,000, ₹1,00,000 किंवा कस्टम रक्कम. हीच तुमची मूळ रक्कम असेल.", tag: "पायरी 1" },
    { icon: icons.calendar, title: "कालावधी निवडा", desc: "6 महिने, 1 वर्ष, 2 वर्षे किंवा 5 वर्षे — जास्त कालावधीत साधारणतः जास्त परतावा मिळतो.", tag: "पायरी 2" },
    { icon: icons.target, title: "तुमचे ध्येय निवडा", desc: "सुरक्षित बचत, जास्त परतावा, मासिक उत्पन्न किंवा कर बचत (80C).", tag: "पायरी 3" },
    { icon: icons.compare, title: "बँकेची तुलना करा आणि निवडा", desc: '"या FD सह पुढे जा" वर क्लिक करा.', tag: "पायरी 4" },
    { icon: icons.user, title: "मूलभूत तपशील प्रविष्ट करा", desc: "तुमचे नाव आणि PAN नंबर द्या.", tag: "पायरी 5" },
    { icon: icons.check, title: "FD तयार झाली (सिम्युलेशन)", desc: 'तुमची FD यशस्वीरित्या "बुक" झाली.', tag: "झाले 🎉", highlight: true },
  ],
  bengali: [
    { icon: icons.amount, title: "বিনিয়োগের পরিমাণ লিখুন", desc: "আপনি কত বিনিয়োগ করতে চান তা বেছে নিন — ₹10,000, ₹50,000, ₹1,00,000 বা কাস্টম পরিমাণ।", tag: "ধাপ ১" },
    { icon: icons.calendar, title: "মেয়াদ বেছে নিন", desc: "৬ মাস, ১ বছর, ২ বছর বা ৫ বছর — দীর্ঘ মেয়াদে সাধারণত বেশি রিটার্ন পাওয়া যায়।", tag: "ধাপ ২" },
    { icon: icons.target, title: "আপনার লক্ষ্য বেছে নিন", desc: "নিরাপদ সঞ্চয়, বেশি রিটার্ন, মাসিক আয় বা কর সাশ্রয় (80C)।", tag: "ধাপ ৩" },
    { icon: icons.compare, title: "ব্যাংক তুলনা করুন এবং বেছে নিন", desc: '"এই FD-তে এগিয়ে যান" ক্লিক করুন।', tag: "ধাপ ৪" },
    { icon: icons.user, title: "মূল তথ্য লিখুন", desc: "আপনার নাম ও PAN নম্বর দিন।", tag: "ধাপ ৫" },
    { icon: icons.check, title: "FD তৈরি হয়েছে (সিমুলেশন)", desc: 'আপনার FD সফলভাবে "বুক" হয়েছে।', tag: "সম্পন্ন 🎉", highlight: true },
  ],
};

// ── Real Bank Steps ────────────────────────────────────────────────────────
const BANK_STEPS: Record<Language, { icon: JSX.Element; title: string; desc: string; tag: string; highlight?: boolean }[]> = {
  english: [
    { icon: icons.login, title: "Login to Bank App or Website", desc: "Open your bank's mobile app or website. Login using your Customer ID / Username and Password or MPIN.", tag: "Step 1" },
    { icon: icons.bank, title: "Go to Deposits / FD Section", desc: 'Look for options like "Fixed Deposit", "Open FD", or "Term Deposit" in the main menu or home screen.', tag: "Step 2" },
    { icon: icons.form, title: "Enter FD Details", desc: "Enter the amount you want to invest, the tenure (time period), and payout type — monthly interest or at maturity.", tag: "Step 3" },
    { icon: icons.review, title: "Select Account & Review", desc: "Choose the account to debit money from. Review the interest rate, maturity amount, and terms & conditions carefully.", tag: "Step 4" },
    { icon: icons.shield, title: "Complete KYC / Verification", desc: "Enter the OTP sent to your registered mobile or complete Aadhaar verification. This confirms your identity.", tag: "Step 5" },
    { icon: icons.payment, title: "Payment & Confirmation", desc: "Money is debited from your account and the FD is created instantly. You receive a confirmation message and FD receipt.", tag: "Done 🎉", highlight: true },
  ],
  hindi: [
    { icon: icons.login, title: "बैंक ऐप या वेबसाइट पर लॉगिन करें", desc: "अपने बैंक का मोबाइल ऐप या वेबसाइट खोलें। Customer ID / Username और Password या MPIN से लॉगिन करें।", tag: "चरण 1" },
    { icon: icons.bank, title: "Deposits / FD सेक्शन में जाएं", desc: 'मुख्य मेनू में "Fixed Deposit", "FD खोलें" या "Term Deposit" जैसे विकल्प देखें।', tag: "चरण 2" },
    { icon: icons.form, title: "FD विवरण दर्ज करें", desc: "निवेश राशि, अवधि और भुगतान प्रकार — मासिक ब्याज या परिपक्वता पर — दर्ज करें।", tag: "चरण 3" },
    { icon: icons.review, title: "खाता चुनें और समीक्षा करें", desc: "पैसे काटने के लिए खाता चुनें। ब्याज दर, परिपक्वता राशि और नियम व शर्तें ध्यान से पढ़ें।", tag: "चरण 4" },
    { icon: icons.shield, title: "KYC / सत्यापन पूरा करें", desc: "रजिस्टर्ड मोबाइल पर आया OTP दर्ज करें या आधार सत्यापन पूरा करें।", tag: "चरण 5" },
    { icon: icons.payment, title: "भुगतान और पुष्टि", desc: "आपके खाते से पैसे कट जाते हैं और FD तुरंत बन जाती है। आपको पुष्टि संदेश और FD रसीद मिलती है।", tag: "हो गया 🎉", highlight: true },
  ],
  tamil: [
    { icon: icons.login, title: "வங்கி ஆப் அல்லது இணையதளத்தில் உள்நுழையுங்கள்", desc: "உங்கள் வங்கியின் மொபைல் ஆப் அல்லது இணையதளத்தை திறங்கள். Customer ID மற்றும் Password அல்லது MPIN மூலம் உள்நுழையுங்கள்.", tag: "படி 1" },
    { icon: icons.bank, title: "Deposits / FD பிரிவுக்கு செல்லுங்கள்", desc: '"Fixed Deposit", "FD திறக்கவும்" அல்லது "Term Deposit" என்ற விருப்பங்களை தேடுங்கள்.', tag: "படி 2" },
    { icon: icons.form, title: "FD விவரங்களை உள்ளிடுங்கள்", desc: "முதலீட்டு தொகை, காலம் மற்றும் வட்டி வகையை உள்ளிடுங்கள்.", tag: "படி 3" },
    { icon: icons.review, title: "கணக்கை தேர்வு செய்து மதிப்பாய்வு செய்யுங்கள்", desc: "பணம் எடுக்கப்படும் கணக்கை தேர்வு செய்யுங்கள். வட்டி விகிதம் மற்றும் விதிமுறைகளை கவனமாக படியுங்கள்.", tag: "படி 4" },
    { icon: icons.shield, title: "KYC / சரிபார்ப்பை முடிக்கவும்", desc: "பதிவு செய்யப்பட்ட மொபைலுக்கு வந்த OTP-ஐ உள்ளிடுங்கள் அல்லது ஆதார் சரிபார்ப்பை முடிக்கவும்.", tag: "படி 5" },
    { icon: icons.payment, title: "கட்டணம் மற்றும் உறுதிப்படுத்தல்", desc: "உங்கள் கணக்கிலிருந்து பணம் எடுக்கப்பட்டு FD உடனடியாக உருவாக்கப்படும்.", tag: "முடிந்தது 🎉", highlight: true },
  ],
  marathi: [
    { icon: icons.login, title: "बँक ॲप किंवा वेबसाइटवर लॉगिन करा", desc: "तुमचे बँकेचे मोबाइल ॲप किंवा वेबसाइट उघडा. Customer ID / Username आणि Password किंवा MPIN ने लॉगिन करा.", tag: "पायरी 1" },
    { icon: icons.bank, title: "Deposits / FD विभागात जा", desc: '"Fixed Deposit", "FD उघडा" किंवा "Term Deposit" असे पर्याय शोधा.', tag: "पायरी 2" },
    { icon: icons.form, title: "FD तपशील प्रविष्ट करा", desc: "गुंतवणूक रक्कम, कालावधी आणि व्याज प्रकार प्रविष्ट करा.", tag: "पायरी 3" },
    { icon: icons.review, title: "खाते निवडा आणि तपासा", desc: "पैसे कापण्यासाठी खाते निवडा. व्याज दर, परिपक्वता रक्कम आणि अटी काळजीपूर्वक वाचा.", tag: "पायरी 4" },
    { icon: icons.shield, title: "KYC / पडताळणी पूर्ण करा", desc: "नोंदणीकृत मोबाइलवर आलेला OTP प्रविष्ट करा किंवा आधार पडताळणी पूर्ण करा.", tag: "पायरी 5" },
    { icon: icons.payment, title: "पेमेंट आणि पुष्टी", desc: "तुमच्या खात्यातून पैसे कापले जातात आणि FD लगेच तयार होते.", tag: "झाले 🎉", highlight: true },
  ],
  bengali: [
    { icon: icons.login, title: "ব্যাংক অ্যাপ বা ওয়েবসাইটে লগইন করুন", desc: "আপনার ব্যাংকের মোবাইল অ্যাপ বা ওয়েবসাইট খুলুন। Customer ID / Username এবং Password বা MPIN দিয়ে লগইন করুন।", tag: "ধাপ ১" },
    { icon: icons.bank, title: "Deposits / FD বিভাগে যান", desc: '"Fixed Deposit", "FD খুলুন" বা "Term Deposit" বিকল্পগুলি খুঁজুন।', tag: "ধাপ ২" },
    { icon: icons.form, title: "FD বিবরণ লিখুন", desc: "বিনিয়োগের পরিমাণ, মেয়াদ এবং সুদের ধরন লিখুন।", tag: "ধাপ ৩" },
    { icon: icons.review, title: "অ্যাকাউন্ট বেছে নিন এবং পর্যালোচনা করুন", desc: "টাকা কাটার জন্য অ্যাকাউন্ট বেছে নিন। সুদের হার ও শর্তাবলী মনোযোগ দিয়ে পড়ুন।", tag: "ধাপ ৪" },
    { icon: icons.shield, title: "KYC / যাচাইকরণ সম্পন্ন করুন", desc: "নিবন্ধিত মোবাইলে আসা OTP লিখুন বা আধার যাচাইকরণ সম্পন্ন করুন।", tag: "ধাপ ৫" },
    { icon: icons.payment, title: "পেমেন্ট ও নিশ্চিতকরণ", desc: "আপনার অ্যাকাউন্ট থেকে টাকা কাটা হয় এবং FD তাৎক্ষণিকভাবে তৈরি হয়।", tag: "সম্পন্ন 🎉", highlight: true },
  ],
};

// ── i18n strings ──────────────────────────────────────────────────────────────
const T: Record<Language, {
  title: string; tabApp: string; tabBank: string;
  appHeading: string; appSub: string;
  bankHeading: string; bankSub: string;
  simNote: string; simNoteBody: string;
  infoNote: string; infoNoteBody: string;
}> = {
  english: {
    title: "FD Booking Guide",
    tabApp: "FD Saathi Guide", tabBank: "Real Bank Process",
    appHeading: "How FD booking works in FD Saathi",
    appSub: "A step-by-step walkthrough of the simulation flow",
    bankHeading: "How to Book an FD in Real Banks",
    bankSub: "Works for SBI, HDFC, ICICI, Axis, Kotak and most other banks",
    simNote: "⚠️ This is a simulation",
    simNoteBody: "This demo shows how FD booking works inside FD Saathi. In real life, you need to invest actual money using your bank account, UPI, or net banking to create an FD.",
    infoNote: "💡 Good to know",
    infoNoteBody: "Most banks complete FD booking in under 5 minutes online. Keep your PAN card and Aadhaar handy. Minimum FD amount is usually ₹1,000 – ₹10,000 depending on the bank.",
  },
  hindi: {
    title: "FD बुकिंग गाइड",
    tabApp: "FD साथी गाइड", tabBank: "असली बैंक प्रक्रिया",
    appHeading: "FD साथी में FD बुकिंग कैसे होती है",
    appSub: "सिमुलेशन फ्लो का चरण-दर-चरण विवरण",
    bankHeading: "असली बैंक में FD कैसे बुक करें",
    bankSub: "SBI, HDFC, ICICI, Axis, Kotak और अधिकतर बैंकों के लिए",
    simNote: "⚠️ यह एक सिमुलेशन है",
    simNoteBody: "यह डेमो दिखाता है कि FD साथी में FD बुकिंग कैसे काम करती है। असल में FD खोलने के लिए आपको अपने बैंक खाते, UPI या नेट बैंकिंग से पैसे लगाने होंगे।",
    infoNote: "💡 जानने योग्य बात",
    infoNoteBody: "अधिकतर बैंक ऑनलाइन 5 मिनट में FD बुकिंग पूरी कर देते हैं। अपना PAN कार्ड और आधार तैयार रखें। न्यूनतम FD राशि आमतौर पर ₹1,000 – ₹10,000 होती है।",
  },
  tamil: {
    title: "FD முன்பதிவு வழிகாட்டி",
    tabApp: "FD சாத்தி வழிகாட்டி", tabBank: "உண்மையான வங்கி செயல்முறை",
    appHeading: "FD சாத்தியில் FD முன்பதிவு எப்படி செயல்படுகிறது",
    appSub: "சிமுலேஷன் ஓட்டத்தின் படிப்படியான விளக்கம்",
    bankHeading: "உண்மையான வங்கியில் FD எப்படி முன்பதிவு செய்வது",
    bankSub: "SBI, HDFC, ICICI, Axis, Kotak மற்றும் பெரும்பாலான வங்கிகளுக்கு",
    simNote: "⚠️ இது ஒரு சிமுலேஷன்",
    simNoteBody: "இந்த டெமோ FD சாத்தியில் FD முன்பதிவு எப்படி செயல்படுகிறது என்பதை காட்டுகிறது. உண்மையில் FD திறக்க உங்கள் வங்கி கணக்கு, UPI அல்லது நெட் பேங்கிங் மூலம் பணம் செலுத்த வேண்டும்.",
    infoNote: "💡 தெரிந்து கொள்ள வேண்டியது",
    infoNoteBody: "பெரும்பாலான வங்கிகள் ஆன்லைனில் 5 நிமிடங்களில் FD முன்பதிவை முடிக்கின்றன. உங்கள் PAN கார்டு மற்றும் ஆதார் தயாராக வைத்திருங்கள்.",
  },
  marathi: {
    title: "FD बुकिंग मार्गदर्शक",
    tabApp: "FD साथी मार्गदर्शक", tabBank: "खरी बँक प्रक्रिया",
    appHeading: "FD साथीमध्ये FD बुकिंग कसे होते",
    appSub: "सिम्युलेशन फ्लोचे चरण-दर-चरण स्पष्टीकरण",
    bankHeading: "खऱ्या बँकेत FD कशी बुक करावी",
    bankSub: "SBI, HDFC, ICICI, Axis, Kotak आणि बहुतेक बँकांसाठी",
    simNote: "⚠️ हे एक सिम्युलेशन आहे",
    simNoteBody: "हा डेमो FD साथीमध्ये FD बुकिंग कसे कार्य करते हे दाखवतो. प्रत्यक्षात FD उघडण्यासाठी तुम्हाला बँक खाते, UPI किंवा नेट बँकिंगद्वारे पैसे गुंतवावे लागतील.",
    infoNote: "💡 हे जाणून घ्या",
    infoNoteBody: "बहुतेक बँका ऑनलाइन 5 मिनिटांत FD बुकिंग पूर्ण करतात. PAN कार्ड आणि आधार तयार ठेवा. किमान FD रक्कम साधारणतः ₹1,000 – ₹10,000 असते.",
  },
  bengali: {
    title: "FD বুকিং গাইড",
    tabApp: "FD সাথী গাইড", tabBank: "আসল ব্যাংক প্রক্রিয়া",
    appHeading: "FD সাথীতে FD বুকিং কীভাবে কাজ করে",
    appSub: "সিমুলেশন ফ্লোর ধাপে ধাপে বিবরণ",
    bankHeading: "আসল ব্যাংকে FD কীভাবে বুক করবেন",
    bankSub: "SBI, HDFC, ICICI, Axis, Kotak এবং বেশিরভাগ ব্যাংকের জন্য",
    simNote: "⚠️ এটি একটি সিমুলেশন",
    simNoteBody: "এই ডেমো দেখায় FD সাথীতে FD বুকিং কীভাবে কাজ করে। বাস্তবে FD খুলতে আপনাকে ব্যাংক অ্যাকাউন্ট, UPI বা নেট ব্যাংকিং দিয়ে টাকা বিনিয়োগ করতে হবে।",
    infoNote: "💡 জেনে রাখুন",
    infoNoteBody: "বেশিরভাগ ব্যাংক অনলাইনে ৫ মিনিটের মধ্যে FD বুকিং সম্পন্ন করে। PAN কার্ড ও আধার প্রস্তুত রাখুন। সর্বনিম্ন FD পরিমাণ সাধারণত ₹১,০০০ – ₹১০,০০০।",
  },
};

export default function BookingModal({ language = "english", onClose }: { language?: Language; onClose: () => void }) {
  const [mode, setMode] = useState<Mode>("app");
  const t = T[language] ?? T.english;

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div
        className="w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl flex flex-col"
        style={{
          background: "linear-gradient(135deg, #0F1C4D 0%, #1A2A6C 100%)",
          border: "1px solid rgba(0,198,255,0.15)",
          maxHeight: "90vh",
        }}
      >
        {/* ── Header ── */}
        <div
          className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
        >
          <div className="flex items-center gap-2.5">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="#00C6FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="22" x2="21" y2="22" /><line x1="6" y1="18" x2="6" y2="11" /><line x1="10" y1="18" x2="10" y2="11" /><line x1="14" y1="18" x2="14" y2="11" /><line x1="18" y1="18" x2="18" y2="11" /><polygon points="12 2 20 7 4 7" />
            </svg>
            <span className="text-white font-bold text-base">{t.title}</span>
          </div>
          <button
            onClick={onClose}
            className="text-[#718096] hover:text-white transition-colors w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/[0.08]"
          >
            ✕
          </button>
        </div>

        {/* ── Toggle ── */}
        <div className="px-5 pt-4 pb-2 flex-shrink-0">
          <div
            className="flex rounded-xl p-1 gap-1"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <button
              onClick={() => setMode("app")}
              className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
              style={
                mode === "app"
                  ? { background: "linear-gradient(90deg,#0072FF,#00C6FF)", color: "#fff", boxShadow: "0 2px 12px rgba(0,114,255,0.35)" }
                  : { color: "#718096" }
              }
            >
              {t.tabApp}
            </button>
            <button
              onClick={() => setMode("bank")}
              className="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
              style={
                mode === "bank"
                  ? { background: "linear-gradient(90deg,#0072FF,#00C6FF)", color: "#fff", boxShadow: "0 2px 12px rgba(0,114,255,0.35)" }
                  : { color: "#718096" }
              }
            >
              {t.tabBank}
            </button>
          </div>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto chat-scroll px-5 pb-5 pt-3 space-y-3">

          {/* ══ APP GUIDE ══ */}
          {mode === "app" && (
            <>
              <div className="mb-1">
                <p className="text-white font-bold text-base">{t.appHeading}</p>
                <p className="text-[#718096] text-xs mt-0.5">{t.appSub}</p>
              </div>

              {/* Steps */}
              <div className="relative">
                <div className="space-y-0">
                  {APP_STEPS[language].map((s, i) => (
                    <>
                      <div
                        key={i}
                        className="flex gap-3 rounded-xl p-3.5 transition-all"
                        style={{
                          background: s.highlight ? "rgba(0,198,255,0.07)" : "rgba(255,255,255,0.03)",
                          border: s.highlight ? "1px solid rgba(0,198,255,0.25)" : "1px solid rgba(255,255,255,0.06)",
                        }}
                      >
                        {/* Step number bubble */}
                        <div
                          className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 text-white"
                          style={{ background: s.highlight ? "linear-gradient(135deg,#0072FF,#00C6FF)" : "rgba(0,198,255,0.12)", border: "1px solid rgba(0,198,255,0.25)" }}
                        >
                          <span style={{ color: s.highlight ? "#fff" : "#00C6FF" }}>{s.icon}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span
                              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                              style={{ background: "rgba(0,198,255,0.12)", color: "#00C6FF" }}
                            >
                              {s.tag}
                            </span>
                          </div>
                          <p className="text-white text-sm font-semibold leading-snug">{s.title}</p>
                          <p className="text-[#A0AEC0] text-xs mt-1 leading-relaxed">{s.desc}</p>
                        </div>
                      </div>
                      {i < APP_STEPS[language].length - 1 && (
                        <div className="flex" style={{ height: "12px" }}>
                          <div style={{ width: "36px", flexShrink: 0 }} className="flex justify-center">
                            <div className="w-0.5 h-full" style={{ background: "linear-gradient(180deg, rgba(0,198,255,0.55) 0%, rgba(0,114,255,0.3) 100%)" }} />
                          </div>
                        </div>
                      )}
                    </>
                  ))}
                </div>
              </div>

              {/* ⚠️ Simulation warning box */}
              <div
                className="rounded-xl p-4 mt-2"
                style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.3)" }}
              >
                <p className="text-amber-400 font-bold text-sm mb-1">{t.simNote}</p>
                <p className="text-[#A0AEC0] text-xs leading-relaxed">
                  {t.simNoteBody}
                </p>
              </div>
            </>
          )}

          {/* ══ REAL BANK GUIDE ══ */}
          {mode === "bank" && (
            <>
              <div className="mb-1">
                <p className="text-white font-bold text-base">{t.bankHeading}</p>
                <p className="text-[#718096] text-xs mt-0.5">{t.bankSub}</p>
              </div>

              <div className="relative">
                <div className="space-y-0">
                  {BANK_STEPS[language].map((s, i) => (
                    <>
                      <div
                        key={i}
                        className="rounded-xl overflow-hidden transition-all"
                        style={{
                          background: s.highlight ? "rgba(0,198,255,0.07)" : "rgba(255,255,255,0.03)",
                          border: s.highlight ? "1px solid rgba(0,198,255,0.25)" : "1px solid rgba(255,255,255,0.06)",
                        }}
                      >
                        <div className="flex gap-3 p-3.5">
                          <div
                            className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{ background: s.highlight ? "linear-gradient(135deg,#0072FF,#00C6FF)" : "rgba(0,198,255,0.12)", border: "1px solid rgba(0,198,255,0.25)" }}
                          >
                            <span style={{ color: s.highlight ? "#fff" : "#00C6FF" }}>{s.icon}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span
                                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                                style={{ background: "rgba(0,198,255,0.12)", color: "#00C6FF" }}
                              >
                                {s.tag}
                              </span>
                            </div>
                            <p className="text-white text-sm font-semibold leading-snug">{s.title}</p>
                            <p className="text-[#A0AEC0] text-xs mt-1 leading-relaxed">{s.desc}</p>
                          </div>
                        </div>
                      </div>
                      {i < BANK_STEPS[language].length - 1 && (
                        <div className="flex" style={{ height: "12px" }}>
                          <div style={{ width: "36px", flexShrink: 0 }} className="flex justify-center">
                            <div className="w-0.5 h-full" style={{ background: "linear-gradient(180deg, rgba(0,198,255,0.55) 0%, rgba(0,114,255,0.3) 100%)" }} />
                          </div>
                        </div>
                      )}
                    </>
                  ))}
                </div>
              </div>

              {/* Info note */}
              <div
                className="rounded-xl p-4 mt-2"
                style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.25)" }}
              >
                <p className="text-indigo-400 font-bold text-sm mb-1">{t.infoNote}</p>
                <p className="text-[#A0AEC0] text-xs leading-relaxed">
                  {t.infoNoteBody}
                </p>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}

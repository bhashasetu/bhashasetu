-- Chat help content: the approved answers My BhashaSetu retrieves from.
--
-- The FAQ page hardcoded five questions in a .tsx file, which meant the chat
-- had no approved help content to retrieve at all — every question would have
-- fallen through to a language model, which is exactly what the chat skill
-- exists to prevent. This makes help content data, so one table feeds both
-- /faq and the assistant and the two cannot drift apart.
--
-- Three languages, held as columns rather than a translations table, matching
-- how learning_entries already holds english_meaning and hindi_meaning. The
-- set is fixed at English, Hindi and Marathi, so a join would buy nothing.
--
-- Aliases are the reason this can work without a model: "is it free" and
-- "how much does it cost" are one question, and an editor adds a phrasing in
-- seconds when they see a new one. Same pattern as learning_entry_aliases.
--
-- Everything seeds as 'draft'. The English is written from what this
-- repository actually does; the Hindi and Marathi are a first pass and want a
-- native speaker's eye on register before anyone publishes them.

CREATE TABLE IF NOT EXISTS public.chat_faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(100) NOT NULL UNIQUE,
  category VARCHAR(50) NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  question_en TEXT NOT NULL,
  answer_en TEXT NOT NULL,
  question_hi TEXT,
  answer_hi TEXT,
  question_mr TEXT,
  answer_mr TEXT,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT chat_faqs_status_valid CHECK (status IN ('draft', 'published', 'archived')),
  CONSTRAINT chat_faqs_category_valid CHECK (
    category IN ('about', 'using', 'language', 'assistant', 'practical')
  )
);

CREATE TABLE IF NOT EXISTS public.chat_faq_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  faq_id UUID NOT NULL REFERENCES public.chat_faqs(id) ON DELETE CASCADE,
  locale VARCHAR(5) NOT NULL,
  alias TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (faq_id, locale, alias),
  CONSTRAINT chat_faq_aliases_locale_valid CHECK (locale IN ('en', 'hi', 'mr'))
);

CREATE INDEX IF NOT EXISTS idx_chat_faqs_status_order
  ON public.chat_faqs (status, display_order);
CREATE INDEX IF NOT EXISTS idx_chat_faq_aliases_locale
  ON public.chat_faq_aliases (locale);

-- Questions that matched nothing.
--
-- The only user text stored anywhere, and the only way the alias list improves
-- by evidence rather than guesswork: this is precisely the list of phrasings an
-- editor should add next. Successful matches are never recorded. Retention is
-- thirty days, which FAQ 'what-happens-to-what-i-type' states plainly to the
-- user rather than burying.
CREATE TABLE IF NOT EXISTS public.chat_unanswered (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_text TEXT NOT NULL,
  locale VARCHAR(5),
  asked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_unanswered_asked_at
  ON public.chat_unanswered (asked_at);

COMMENT ON TABLE public.chat_unanswered IS
  'Unmatched chat queries, 30-day retention. Purge with: DELETE FROM chat_unanswered WHERE asked_at < now() - interval ''30 days''; No successful query is recorded here.';

ALTER TABLE public.chat_faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_faq_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_unanswered ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_published_faqs" ON public.chat_faqs
  FOR SELECT USING (status = 'published');

CREATE POLICY "public_read_aliases_for_published_faqs" ON public.chat_faq_aliases
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.chat_faqs WHERE id = faq_id AND status = 'published')
  );

-- Write-only for the public: a visitor's unmatched question can be recorded,
-- but no visitor can read what anyone else has asked.
CREATE POLICY "public_insert_unanswered" ON public.chat_unanswered
  FOR INSERT WITH CHECK (true);

CREATE POLICY "admin_full_faqs" ON public.chat_faqs
  FOR ALL USING (public.is_admin());
CREATE POLICY "admin_full_faq_aliases" ON public.chat_faq_aliases
  FOR ALL USING (public.is_admin());
CREATE POLICY "admin_read_unanswered" ON public.chat_unanswered
  FOR ALL USING (public.is_admin());

-- === SEED ===
INSERT INTO public.chat_faqs
  (slug, category, display_order,
   question_en, answer_en, question_hi, answer_hi, question_mr, answer_mr)
VALUES
  ('what-is-bhasha-setu', 'about', 10, 'What is Bhasha Setu?', 'Bhasha Setu is a learning platform for the Warli and Katkari languages, built by students together with the communities who speak them. You can look up words and phrases, hear them spoken by native speakers, and listen to stories and interviews recorded in the communities themselves.', 'भाषा सेतु क्या है?', 'भाषा सेतु वारली और कातकरी भाषाओं को सीखने का एक मंच है, जिसे छात्रों ने इन भाषाओं को बोलने वाले समुदायों के साथ मिलकर बनाया है। यहाँ आप शब्द और वाक्यांश खोज सकते हैं, उन्हें मूल वक्ताओं की आवाज़ में सुन सकते हैं, और समुदाय में रिकॉर्ड की गई कहानियाँ सुन सकते हैं।', 'भाषा सेतू म्हणजे काय?', 'भाषा सेतू हे वारली आणि कातकरी भाषा शिकण्याचे व्यासपीठ आहे, जे विद्यार्थ्यांनी या भाषा बोलणाऱ्या समुदायांसोबत मिळून तयार केले आहे. इथे तुम्ही शब्द आणि वाक्प्रचार शोधू शकता, ते मूळ भाषिकांच्या आवाजात ऐकू शकता, आणि समुदायात रेकॉर्ड केलेल्या कथा ऐकू शकता.'),
  ('which-languages', 'about', 20, 'Which languages can I learn here?', 'Warli and Katkari. Both are Adivasi languages of Maharashtra. We have kept the scope to these two on purpose, so that every word, phrase and recording can be checked with the communities who speak them, rather than covering many languages shallowly.', 'यहाँ मैं कौन सी भाषाएँ सीख सकता हूँ?', 'वारली और कातकरी। दोनों महाराष्ट्र की आदिवासी भाषाएँ हैं। हमने जानबूझकर इन्हीं दो तक सीमित रखा है, ताकि हर शब्द, वाक्यांश और रिकॉर्डिंग उन समुदायों के साथ जाँची जा सके जो इन्हें बोलते हैं।', 'इथे मी कोणत्या भाषा शिकू शकतो?', 'वारली आणि कातकरी. दोन्ही महाराष्ट्रातील आदिवासी भाषा आहेत. आम्ही जाणीवपूर्वक याच दोन भाषांपुरते मर्यादित ठेवले आहे, जेणेकरून प्रत्येक शब्द, वाक्प्रचार आणि रेकॉर्डिंग त्या समुदायांसोबत तपासता येईल.'),
  ('who-is-it-for', 'about', 30, 'Who is Bhasha Setu for?', 'Anyone who wants to learn or hear Warli and Katkari — community members, their children, students, teachers and researchers. You do not need to know either language to begin. Every entry shows the meaning in English and Hindi alongside the original word.', 'भाषा सेतु किसके लिए है?', 'हर उस व्यक्ति के लिए जो वारली और कातकरी सीखना या सुनना चाहता है — समुदाय के सदस्य, उनके बच्चे, छात्र, शिक्षक और शोधकर्ता। शुरू करने के लिए इन भाषाओं का ज्ञान ज़रूरी नहीं। हर शब्द का अर्थ अंग्रेज़ी और हिन्दी में दिया गया है।', 'भाषा सेतू कोणासाठी आहे?', 'वारली आणि कातकरी शिकू किंवा ऐकू इच्छिणाऱ्या प्रत्येकासाठी — समुदायातील सदस्य, त्यांची मुले, विद्यार्थी, शिक्षक आणि संशोधक. सुरुवात करण्यासाठी या भाषा येणे आवश्यक नाही. प्रत्येक नोंदीत अर्थ इंग्रजी आणि हिंदीत दिलेला असतो.'),
  ('is-it-free', 'about', 40, 'Is Bhasha Setu free?', 'Yes, and it always will be. There is no charge, no subscription and no account to create. Bhasha Setu is a student-built project made with community participation, and keeping it free for everyone is part of the point.', 'क्या भाषा सेतु निःशुल्क है?', 'हाँ, और हमेशा रहेगा। कोई शुल्क नहीं, कोई सदस्यता नहीं, और खाता बनाने की ज़रूरत नहीं। भाषा सेतु छात्रों द्वारा समुदाय की भागीदारी से बनाया गया है, और इसे सबके लिए निःशुल्क रखना इसी सोच का हिस्सा है।', 'भाषा सेतू विनामूल्य आहे का?', 'होय, आणि नेहमीच राहील. कोणतेही शुल्क नाही, वर्गणी नाही, आणि खाते तयार करण्याची गरज नाही. भाषा सेतू विद्यार्थ्यांनी समुदायाच्या सहभागातून तयार केले आहे, आणि ते विनामूल्य ठेवणे हा त्याच विचाराचा भाग आहे.'),
  ('find-a-word', 'using', 50, 'How do I find a word?', 'Use the Language Explorer, or ask My BhashaSetu directly. You can search by the Warli or Katkari word, by its English or Hindi meaning, or by how it sounds written in English letters. Any of those will find the entry if we have it.', 'मैं कोई शब्द कैसे ढूँढूँ?', 'भाषा एक्सप्लोरर का उपयोग करें, या सीधे माय भाषा सेतु से पूछें। आप वारली या कातकरी शब्द से, उसके अंग्रेज़ी या हिन्दी अर्थ से, या रोमन अक्षरों में उसकी ध्वनि से खोज सकते हैं।', 'मी एखादा शब्द कसा शोधू?', 'भाषा एक्सप्लोरर वापरा, किंवा थेट माय भाषा सेतूला विचारा. तुम्ही वारली किंवा कातकरी शब्दाने, त्याच्या इंग्रजी किंवा हिंदी अर्थाने, किंवा रोमन अक्षरांतील उच्चाराने शोधू शकता.'),
  ('hear-pronunciation', 'using', 60, 'How do I hear how a word is said?', 'Every entry that has a recording shows a play button beside it. The audio is a recording of a native speaker, not a computer voice, so what you hear is how the word is actually said in the community.', 'मैं किसी शब्द का उच्चारण कैसे सुनूँ?', 'जिस भी शब्द की रिकॉर्डिंग उपलब्ध है, उसके साथ एक प्ले बटन दिखता है। यह आवाज़ किसी मूल वक्ता की है, कंप्यूटर की नहीं — इसलिए आप वही सुनते हैं जो समुदाय में वास्तव में बोला जाता है।', 'एखादा शब्द कसा उच्चारला जातो हे मी कसे ऐकू?', 'ज्या नोंदीसाठी रेकॉर्डिंग उपलब्ध आहे, तिच्या शेजारी प्ले बटण दिसते. हा आवाज मूळ भाषिकाचा असतो, संगणकाचा नाही — त्यामुळे समुदायात प्रत्यक्षात जसे बोलले जाते, तेच तुम्ही ऐकता.'),
  ('android-app', 'using', 70, 'Is there an Android app?', 'Yes. The Android app carries the same words, lessons and recordings as the website, and you can install it from the download page. The website works well on a phone too, so you can start straight away without installing anything.', 'क्या एंड्रॉइड ऐप है?', 'हाँ। एंड्रॉइड ऐप में वही शब्द, पाठ और रिकॉर्डिंग हैं जो वेबसाइट पर हैं, और आप इसे डाउनलोड पृष्ठ से इंस्टॉल कर सकते हैं। वेबसाइट फ़ोन पर भी अच्छी चलती है, इसलिए आप बिना कुछ इंस्टॉल किए शुरू कर सकते हैं।', 'अँड्रॉइड ॲप आहे का?', 'होय. अँड्रॉइड ॲपमध्ये संकेतस्थळावरचेच शब्द, धडे आणि रेकॉर्डिंग आहेत, आणि ते तुम्ही डाउनलोड पानावरून स्थापित करू शकता. संकेतस्थळ फोनवरही व्यवस्थित चालते, त्यामुळे काहीही स्थापित न करता लगेच सुरुवात करता येते.'),
  ('works-on-phone', 'using', 80, 'Does it work on my phone''s browser?', 'Yes. Bhasha Setu is designed for a phone screen as much as a laptop, and everything works in a mobile browser — search, stories, recordings and the assistant. Nothing needs to be installed.', 'क्या यह मेरे फ़ोन के ब्राउज़र में चलेगा?', 'हाँ। भाषा सेतु फ़ोन की स्क्रीन के लिए उतना ही बनाया गया है जितना लैपटॉप के लिए। खोज, कहानियाँ, रिकॉर्डिंग और सहायक — सब कुछ मोबाइल ब्राउज़र में काम करता है। कुछ भी इंस्टॉल करने की ज़रूरत नहीं।', 'हे माझ्या फोनच्या ब्राउझरमध्ये चालते का?', 'होय. भाषा सेतू फोनच्या पडद्यासाठी लॅपटॉपइतकेच तयार केले आहे. शोध, कथा, रेकॉर्डिंग आणि सहायक — सर्व काही मोबाइल ब्राउझरमध्ये चालते. काहीही स्थापित करण्याची गरज नाही.'),
  ('where-content-comes-from', 'language', 90, 'Where does the Warli and Katkari content come from?', 'From the communities themselves. Words, phrases and recordings are collected with Warli and Katkari speakers, then checked before they are published. Nothing here is generated by a computer or translated automatically — if it is on Bhasha Setu, a person from the community stands behind it.', 'वारली और कातकरी सामग्री कहाँ से आती है?', 'समुदायों से ही। शब्द, वाक्यांश और रिकॉर्डिंग वारली और कातकरी बोलने वालों के साथ इकट्ठा किए जाते हैं और प्रकाशित होने से पहले जाँचे जाते हैं। यहाँ कुछ भी कंप्यूटर से नहीं बनाया गया — जो है, उसके पीछे समुदाय का कोई व्यक्ति है।', 'वारली आणि कातकरी मजकूर कुठून येतो?', 'समुदायांकडूनच. शब्द, वाक्प्रचार आणि रेकॉर्डिंग वारली व कातकरी भाषिकांसोबत गोळा केले जातात आणि प्रकाशित होण्यापूर्वी तपासले जातात. इथले काहीही संगणकाने तयार केलेले नाही — जे आहे, त्यामागे समुदायातील एक व्यक्ती आहे.'),
  ('word-not-found', 'language', 100, 'Why can''t I find the word I searched for?', 'Because we have not collected it yet. Bhasha Setu only shows words that have been recorded and checked with the community, so the collection grows slowly and deliberately. If a search finds nothing, it means the word is not in our collection — not that it does not exist.', 'मुझे खोजा हुआ शब्द क्यों नहीं मिला?', 'क्योंकि हमने उसे अभी तक इकट्ठा नहीं किया। भाषा सेतु केवल वही शब्द दिखाता है जो समुदाय के साथ रिकॉर्ड और जाँचे गए हैं। अगर खोज में कुछ नहीं मिला, तो इसका अर्थ है कि वह शब्द हमारे संग्रह में नहीं है — यह नहीं कि वह शब्द है ही नहीं।', 'मी शोधलेला शब्द का सापडत नाही?', 'कारण आम्ही तो अजून गोळा केलेला नाही. भाषा सेतू फक्त तेच शब्द दाखवते जे समुदायासोबत रेकॉर्ड आणि तपासले गेले आहेत. शोधात काही न मिळाल्यास याचा अर्थ तो शब्द आमच्या संग्रहात नाही — तो अस्तित्वातच नाही असे नाही.'),
  ('no-audio', 'language', 110, 'Why do some words have no audio?', 'A recording is only published once it has been made with a community speaker and their consent recorded. Some entries are still waiting for that. Where audio is missing you will still see the word and its meaning — we would rather show nothing than an artificial voice.', 'कुछ शब्दों के साथ आवाज़ क्यों नहीं है?', 'रिकॉर्डिंग तभी प्रकाशित होती है जब वह समुदाय के किसी वक्ता के साथ, उनकी सहमति दर्ज करके बनाई गई हो। कुछ शब्द अभी इसकी प्रतीक्षा में हैं। जहाँ आवाज़ नहीं है, वहाँ शब्द और अर्थ फिर भी दिखेंगे — हम कृत्रिम आवाज़ लगाने के बजाय कुछ न देना बेहतर मानते हैं।', 'काही शब्दांना आवाज का नाही?', 'रेकॉर्डिंग तेव्हाच प्रकाशित होते जेव्हा ती समुदायातील भाषिकासोबत, त्यांची संमती नोंदवून केलेली असते. काही नोंदी अजून त्याची वाट पाहत आहेत. जिथे आवाज नाही तिथे शब्द आणि अर्थ मात्र दिसतील — कृत्रिम आवाज लावण्यापेक्षा काहीच न देणे आम्हाला योग्य वाटते.'),
  ('translate-sentences', 'language', 120, 'Can Bhasha Setu translate sentences into Warli or Katkari?', 'No. Bhasha Setu is not a translator. It shows words and phrases that have been collected and checked with the community. If you ask for a sentence we have not collected, it will tell you so rather than guess — an invented Warli sentence would do more harm than no answer.', 'क्या भाषा सेतु वाक्यों का वारली या कातकरी में अनुवाद कर सकता है?', 'नहीं। भाषा सेतु अनुवादक नहीं है। यह केवल वे शब्द और वाक्यांश दिखाता है जो समुदाय के साथ इकट्ठा और जाँचे गए हैं। अगर आप ऐसा वाक्य माँगें जो हमारे पास नहीं है, तो यह अनुमान लगाने के बजाय साफ़ बता देगा — गढ़ा हुआ वारली वाक्य बिना उत्तर से ज़्यादा नुक़सान करेगा।', 'भाषा सेतू वाक्यांचे वारली किंवा कातकरीत भाषांतर करू शकते का?', 'नाही. भाषा सेतू भाषांतरकार नाही. ते फक्त समुदायासोबत गोळा केलेले आणि तपासलेले शब्द व वाक्प्रचार दाखवते. आमच्याकडे नसलेले वाक्य विचारल्यास ते अंदाज लावण्याऐवजी स्पष्ट सांगेल — तयार केलेले वारली वाक्य उत्तर न देण्यापेक्षा जास्त नुकसान करेल.'),
  ('what-is-my-bhashasetu', 'assistant', 130, 'What is My BhashaSetu?', 'My BhashaSetu is the assistant on this site. It does two things: it answers questions about how to use Bhasha Setu, and it looks up Warli and Katkari words for you, showing the meaning and playing the recording where one exists.', 'माय भाषा सेतु क्या है?', 'माय भाषा सेतु इस साइट का सहायक है। यह दो काम करता है: भाषा सेतु के उपयोग से जुड़े सवालों के जवाब देता है, और वारली तथा कातकरी शब्दों का अर्थ खोजकर दिखाता है, साथ ही रिकॉर्डिंग उपलब्ध हो तो सुनाता है।', 'माय भाषा सेतू म्हणजे काय?', 'माय भाषा सेतू हा या संकेतस्थळावरील सहायक आहे. तो दोन कामे करतो: भाषा सेतू कसे वापरायचे याविषयीच्या प्रश्नांची उत्तरे देतो, आणि वारली व कातकरी शब्दांचा अर्थ शोधून दाखवतो, तसेच रेकॉर्डिंग असल्यास ऐकवतो.'),
  ('does-it-invent', 'assistant', 140, 'Does the assistant ever make up words?', 'No. When you ask about a Warli or Katkari word, the assistant searches our collection and shows you what is there. It cannot write language content of its own. If nothing matches, it says so — it is built so that inventing a word is not possible, not merely discouraged.', 'क्या सहायक कभी शब्द गढ़ लेता है?', 'नहीं। जब आप किसी वारली या कातकरी शब्द के बारे में पूछते हैं, तो सहायक हमारे संग्रह में खोजता है और वहीं से दिखाता है। यह अपनी ओर से भाषा सामग्री लिख ही नहीं सकता। कुछ न मिले तो वह साफ़ कह देता है।', 'सहायक कधी शब्द स्वतः तयार करतो का?', 'नाही. तुम्ही वारली किंवा कातकरी शब्दाविषयी विचारता तेव्हा सहायक आमच्या संग्रहात शोधतो आणि तिथूनच दाखवतो. तो स्वतःहून भाषिक मजकूर लिहूच शकत नाही. काही न सापडल्यास तो तसे स्पष्ट सांगतो.'),
  ('what-happens-to-what-i-type', 'practical', 150, 'What happens to what I type here?', 'It stays with Bhasha Setu. Your questions are matched against our own published content on our own servers, and nothing is sent to any other company. We do not ask for your name or email. Questions that find no answer are kept for thirty days so we can improve the answers.', 'मैं जो यहाँ लिखता हूँ उसका क्या होता है?', 'वह भाषा सेतु के पास ही रहता है। आपके सवाल हमारे अपने सर्वर पर, हमारी प्रकाशित सामग्री से मिलाए जाते हैं; किसी और कंपनी को कुछ नहीं भेजा जाता। हम आपका नाम या ईमेल नहीं माँगते। जिन सवालों का उत्तर नहीं मिलता, उन्हें तीस दिन तक रखा जाता है ताकि हम उत्तर बेहतर कर सकें।', 'मी इथे जे लिहितो त्याचे काय होते?', 'ते भाषा सेतूकडेच राहते. तुमचे प्रश्न आमच्याच सर्व्हरवर, आमच्या प्रकाशित मजकुराशी जुळवले जातात; इतर कोणत्याही कंपनीला काहीही पाठवले जात नाही. आम्ही तुमचे नाव किंवा ईमेल विचारत नाही. ज्या प्रश्नांची उत्तरे मिळत नाहीत ते तीस दिवस ठेवले जातात, जेणेकरून आम्ही उत्तरे सुधारू शकू.')
ON CONFLICT (slug) DO NOTHING;

-- Alternative phrasings. Deterministic matching lives or dies on these.
INSERT INTO public.chat_faq_aliases (faq_id, locale, alias)
SELECT f.id, v.locale, v.alias
FROM (VALUES
  ('what-is-bhasha-setu', 'en', 'what is this site'),
  ('what-is-bhasha-setu', 'en', 'tell me about bhasha setu'),
  ('what-is-bhasha-setu', 'en', 'what does bhasha setu do'),
  ('what-is-bhasha-setu', 'en', 'about bhasha setu'),
  ('what-is-bhasha-setu', 'hi', 'यह वेबसाइट क्या है'),
  ('what-is-bhasha-setu', 'hi', 'भाषा सेतु के बारे में बताइए'),
  ('what-is-bhasha-setu', 'hi', 'भाषा सेतु का क्या काम है'),
  ('what-is-bhasha-setu', 'mr', 'हे संकेतस्थळ काय आहे'),
  ('what-is-bhasha-setu', 'mr', 'भाषा सेतू विषयी सांगा'),
  ('what-is-bhasha-setu', 'mr', 'भाषा सेतू काय करते'),
  ('which-languages', 'en', 'which languages'),
  ('which-languages', 'en', 'what languages are available'),
  ('which-languages', 'en', 'do you have hindi'),
  ('which-languages', 'en', 'how many languages'),
  ('which-languages', 'en', 'is santhali available'),
  ('which-languages', 'hi', 'कौन सी भाषाएँ हैं'),
  ('which-languages', 'hi', 'कितनी भाषाएँ हैं'),
  ('which-languages', 'hi', 'क्या हिन्दी है'),
  ('which-languages', 'mr', 'कोणत्या भाषा आहेत'),
  ('which-languages', 'mr', 'किती भाषा आहेत'),
  ('who-is-it-for', 'en', 'who is this for'),
  ('who-is-it-for', 'en', 'can I use it if I do not know warli'),
  ('who-is-it-for', 'en', 'is it for children'),
  ('who-is-it-for', 'en', 'is it for students'),
  ('who-is-it-for', 'hi', 'यह किसके लिए है'),
  ('who-is-it-for', 'hi', 'क्या बच्चों के लिए है'),
  ('who-is-it-for', 'mr', 'हे कोणासाठी आहे'),
  ('who-is-it-for', 'mr', 'मुलांसाठी आहे का'),
  ('is-it-free', 'en', 'is it free'),
  ('is-it-free', 'en', 'how much does it cost'),
  ('is-it-free', 'en', 'do I have to pay'),
  ('is-it-free', 'en', 'is there a subscription'),
  ('is-it-free', 'en', 'price'),
  ('is-it-free', 'hi', 'क्या यह मुफ़्त है'),
  ('is-it-free', 'hi', 'कितना पैसा लगता है'),
  ('is-it-free', 'hi', 'क्या शुल्क है'),
  ('is-it-free', 'mr', 'हे मोफत आहे का'),
  ('is-it-free', 'mr', 'किती पैसे लागतात'),
  ('is-it-free', 'mr', 'शुल्क आहे का'),
  ('find-a-word', 'en', 'how do I search'),
  ('find-a-word', 'en', 'where do I look up a word'),
  ('find-a-word', 'en', 'how to find meaning'),
  ('find-a-word', 'en', 'search for a word'),
  ('find-a-word', 'hi', 'शब्द कैसे खोजें'),
  ('find-a-word', 'hi', 'अर्थ कहाँ मिलेगा'),
  ('find-a-word', 'mr', 'शब्द कसा शोधायचा'),
  ('find-a-word', 'mr', 'अर्थ कुठे मिळेल'),
  ('hear-pronunciation', 'en', 'how do I hear a word'),
  ('hear-pronunciation', 'en', 'is there audio'),
  ('hear-pronunciation', 'en', 'pronunciation'),
  ('hear-pronunciation', 'en', 'how is it pronounced'),
  ('hear-pronunciation', 'en', 'play sound'),
  ('hear-pronunciation', 'hi', 'उच्चारण कैसे सुनें'),
  ('hear-pronunciation', 'hi', 'क्या आवाज़ है'),
  ('hear-pronunciation', 'hi', 'कैसे बोलते हैं'),
  ('hear-pronunciation', 'mr', 'उच्चार कसा ऐकायचा'),
  ('hear-pronunciation', 'mr', 'आवाज आहे का'),
  ('android-app', 'en', 'is there an app'),
  ('android-app', 'en', 'android app'),
  ('android-app', 'en', 'can I download the app'),
  ('android-app', 'en', 'apk'),
  ('android-app', 'en', 'play store'),
  ('android-app', 'hi', 'क्या ऐप है'),
  ('android-app', 'hi', 'एंड्रॉइड ऐप'),
  ('android-app', 'hi', 'ऐप कैसे डाउनलोड करें'),
  ('android-app', 'mr', 'ॲप आहे का'),
  ('android-app', 'mr', 'अँड्रॉइड ॲप'),
  ('android-app', 'mr', 'ॲप कसे डाउनलोड करायचे'),
  ('works-on-phone', 'en', 'does it work on mobile'),
  ('works-on-phone', 'en', 'can I use it on my phone'),
  ('works-on-phone', 'en', 'mobile browser'),
  ('works-on-phone', 'hi', 'क्या फ़ोन पर चलेगा'),
  ('works-on-phone', 'hi', 'मोबाइल पर काम करता है'),
  ('works-on-phone', 'mr', 'फोनवर चालते का'),
  ('works-on-phone', 'mr', 'मोबाइलवर काम करते का'),
  ('where-content-comes-from', 'en', 'where does the content come from'),
  ('where-content-comes-from', 'en', 'who checks the words'),
  ('where-content-comes-from', 'en', 'is it verified'),
  ('where-content-comes-from', 'en', 'how do you know it is correct'),
  ('where-content-comes-from', 'en', 'sources'),
  ('where-content-comes-from', 'hi', 'सामग्री कहाँ से आती है'),
  ('where-content-comes-from', 'hi', 'कौन जाँचता है'),
  ('where-content-comes-from', 'hi', 'क्या यह सत्यापित है'),
  ('where-content-comes-from', 'mr', 'मजकूर कुठून येतो'),
  ('where-content-comes-from', 'mr', 'कोण तपासते'),
  ('where-content-comes-from', 'mr', 'हे तपासलेले आहे का'),
  ('word-not-found', 'en', 'word not found'),
  ('word-not-found', 'en', 'why is my word missing'),
  ('word-not-found', 'en', 'no results'),
  ('word-not-found', 'en', 'nothing found'),
  ('word-not-found', 'en', 'why is this word not here'),
  ('word-not-found', 'hi', 'शब्द नहीं मिला'),
  ('word-not-found', 'hi', 'कुछ नहीं मिला'),
  ('word-not-found', 'hi', 'यह शब्द क्यों नहीं है'),
  ('word-not-found', 'mr', 'शब्द सापडला नाही'),
  ('word-not-found', 'mr', 'काहीच सापडले नाही'),
  ('no-audio', 'en', 'why is there no audio'),
  ('no-audio', 'en', 'missing pronunciation'),
  ('no-audio', 'en', 'no sound for this word'),
  ('no-audio', 'en', 'audio not available'),
  ('no-audio', 'hi', 'आवाज़ क्यों नहीं है'),
  ('no-audio', 'hi', 'उच्चारण नहीं है'),
  ('no-audio', 'mr', 'आवाज का नाही'),
  ('no-audio', 'mr', 'उच्चार नाही'),
  ('translate-sentences', 'en', 'can you translate'),
  ('translate-sentences', 'en', 'translate this sentence'),
  ('translate-sentences', 'en', 'how do you say this in warli'),
  ('translate-sentences', 'en', 'is this a translator'),
  ('translate-sentences', 'en', 'translate to katkari'),
  ('translate-sentences', 'hi', 'क्या आप अनुवाद कर सकते हैं'),
  ('translate-sentences', 'hi', 'इसका वारली में अनुवाद करें'),
  ('translate-sentences', 'hi', 'यह वारली में कैसे कहेंगे'),
  ('translate-sentences', 'mr', 'भाषांतर करू शकता का'),
  ('translate-sentences', 'mr', 'हे वारलीत कसे म्हणायचे'),
  ('what-is-my-bhashasetu', 'en', 'what is my bhashasetu'),
  ('what-is-my-bhashasetu', 'en', 'what can the assistant do'),
  ('what-is-my-bhashasetu', 'en', 'what is the chatbot'),
  ('what-is-my-bhashasetu', 'en', 'who is the robot'),
  ('what-is-my-bhashasetu', 'hi', 'माय भाषा सेतु क्या करता है'),
  ('what-is-my-bhashasetu', 'hi', 'सहायक क्या कर सकता है'),
  ('what-is-my-bhashasetu', 'mr', 'माय भाषा सेतू काय करते'),
  ('what-is-my-bhashasetu', 'mr', 'सहायक काय करू शकतो'),
  ('does-it-invent', 'en', 'does it make things up'),
  ('does-it-invent', 'en', 'is it ai generated'),
  ('does-it-invent', 'en', 'can I trust the answers'),
  ('does-it-invent', 'en', 'does it hallucinate'),
  ('does-it-invent', 'en', 'is this verified content'),
  ('does-it-invent', 'hi', 'क्या यह ख़ुद बना लेता है'),
  ('does-it-invent', 'hi', 'क्या यह एआई से बना है'),
  ('does-it-invent', 'hi', 'क्या इस पर भरोसा करें'),
  ('does-it-invent', 'mr', 'हे स्वतः तयार करते का'),
  ('does-it-invent', 'mr', 'यावर विश्वास ठेवावा का'),
  ('what-happens-to-what-i-type', 'en', 'is my data private'),
  ('what-happens-to-what-i-type', 'en', 'do you store my messages'),
  ('what-happens-to-what-i-type', 'en', 'privacy'),
  ('what-happens-to-what-i-type', 'en', 'what do you do with my questions'),
  ('what-happens-to-what-i-type', 'en', 'do you share my data'),
  ('what-happens-to-what-i-type', 'hi', 'क्या मेरा डेटा सुरक्षित है'),
  ('what-happens-to-what-i-type', 'hi', 'क्या आप मेरे संदेश रखते हैं'),
  ('what-happens-to-what-i-type', 'hi', 'निजता'),
  ('what-happens-to-what-i-type', 'mr', 'माझा डेटा सुरक्षित आहे का'),
  ('what-happens-to-what-i-type', 'mr', 'तुम्ही माझे संदेश ठेवता का')
) AS v(slug, locale, alias)
JOIN public.chat_faqs f ON f.slug = v.slug
ON CONFLICT (faq_id, locale, alias) DO NOTHING;

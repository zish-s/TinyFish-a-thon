import type { IncidentLabel } from '../types.js';

/**
 * Hand-labelled training corpus for the triage classifier.
 *
 * Every example is a real-shaped sentence a victim might type. Labels are
 * multi-label: one sentence can be "impersonation + financial_fraud +
 * image_misuse" at once, which is exactly the case a single-label model
 * would get wrong.
 *
 * The corpus is intentionally small, hand-written and auditable. That is a
 * feature for a hackathon pitch: the model is explainable, the training set
 * is readable, and `npm run eval` prints a real confusion matrix.
 */
export interface TrainingExample {
  text: string;
  labels: IncidentLabel[];
}

export const TRAINING_DATA: TrainingExample[] = [
  // ---------- impersonation ----------
  { text: 'Someone created a fake Instagram account using my name and my photo', labels: ['impersonation', 'image_misuse'] },
  { text: 'A person is pretending to be me on Facebook and messaging my friends', labels: ['impersonation'] },
  { text: 'There is a lookalike profile of me on LinkedIn asking recruiters for my resume', labels: ['impersonation'] },
  { text: 'A cloned account is impersonating me and asking people to send money', labels: ['impersonation', 'financial_fraud'] },
  { text: 'Someone is masquerading as me on WhatsApp and has taken over my contacts list', labels: ['impersonation', 'account_takeover'] },
  { text: 'My own employer profile was copied and someone is posing as me to clients', labels: ['impersonation', 'defamation'] },
  { text: 'A fake account with my full name is running a lottery scam in my city', labels: ['impersonation', 'financial_fraud'] },
  { text: 'The guy from the fraud call made a fake profile that looks exactly like me', labels: ['impersonation', 'financial_fraud'] },

  // ---------- financial fraud ----------
  { text: 'I paid fifty thousand rupees to an online vendor and never got the product', labels: ['financial_fraud', 'counterfeit'] },
  { text: 'Someone tricked me into a fake job and asked for a registration fee', labels: ['financial_fraud', 'counterfeit'] },
  { text: 'I sent money to a wrong UPI id and the fraudster is not responding', labels: ['financial_fraud'] },
  { text: 'My credit card was used for transactions I never made in another city', labels: ['financial_fraud', 'account_takeover'] },
  { text: 'An investment group promised me returns and disappeared with my savings', labels: ['financial_fraud', 'romance_scam'] },
  { text: 'I lost money in a crypto investment scheme run on telegram', labels: ['financial_fraud', 'romance_scam'] },
  { text: 'A refund scam call asked for my card details and money was deducted', labels: ['financial_fraud'] },
  { text: 'Someone took a loan against my name without my consent', labels: ['financial_fraud', 'impersonation'] },
  { text: 'My bank account was debited for a fraudulent UPI payment of twelve thousand', labels: ['financial_fraud'] },
  { text: 'I transferred the money to a stranger who said he would double it', labels: ['financial_fraud'] },

  // ---------- image misuse ----------
  { text: 'Someone used my photos in a fake advertisement without asking me', labels: ['image_misuse'] },
  { text: 'My selfies were turned into a deepfake video that is going viral', labels: ['image_misuse', 'misinformation'] },
  { text: 'A website is using my photo for a fake loan advertisement', labels: ['image_misuse', 'financial_fraud'] },
  { text: 'My ex posted our private pictures on a public page', labels: ['image_misuse', 'sextortion'] },
  { text: 'Someone photoshopped my face onto obscene content', labels: ['image_misuse', 'harassment'] },
  { text: 'My college photos were used to create a fake dating profile', labels: ['image_misuse', 'impersonation'] },
  { text: 'A meme page is using my photograph without credit', labels: ['image_misuse'] },
  { text: 'They made a fake reel with my voice using AI', labels: ['image_misuse', 'misinformation'] },

  // ---------- harassment ----------
  { text: 'A stranger keeps sending me abusive messages on Instagram every day', labels: ['harassment'] },
  { text: 'My classmate is bullying me and threatening me in the class group', labels: ['harassment'] },
  { text: 'I am getting constant trolling comments under all my posts', labels: ['harassment'] },
  { text: 'Someone is harassing me over WhatsApp and insulting my family', labels: ['harassment'] },
  { text: 'He keeps calling me at night and abusing me', labels: ['harassment', 'stalking'] },
  { text: 'A troll account is commenting on my family and sending threats', labels: ['harassment', 'hate_speech'] },
  { text: 'My ex keeps sending abusive messages to me and my new colleagues', labels: ['harassment', 'stalking'] },
  { text: 'I am being targeted with hateful and abusive comments for days', labels: ['harassment', 'hate_speech'] },

  // ---------- hate speech ----------
  { text: 'People in the comments are using casteist slurs against my community', labels: ['hate_speech'] },
  { text: 'Someone posted a video calling all women of my religion thieves', labels: ['hate_speech', 'misinformation'] },
  { text: 'A page is spreading hateful content about disabled people like me', labels: ['hate_speech'] },
  { text: 'He keeps tweeting that my community is a disease', labels: ['hate_speech'] },
  { text: 'The comments under my video are full of communal and sexist abuse', labels: ['hate_speech', 'harassment'] },
  { text: 'My landlord posted a note saying we should not keep people of my religion', labels: ['hate_speech', 'doxxing'] },

  // ---------- stalking ----------
  { text: 'A man keeps waiting outside my house and follows me to college', labels: ['stalking'] },
  { text: 'My location keeps showing up on a public map and someone found my flat', labels: ['stalking', 'doxxing'] },
  { text: 'Someone tracked my phone and showed up at my gym', labels: ['stalking', 'account_takeover'] },
  { text: 'He memorises my route and appears at the same bus stop daily', labels: ['stalking'] },
  { text: 'My ex is sharing my live location with strangers on telegram', labels: ['stalking', 'doxxing'] },
  { text: 'Someone is following my car and I am scared', labels: ['stalking'] },

  // ---------- doxxing ----------
  { text: 'A website published my home address and phone number', labels: ['doxxing'] },
  { text: 'Someone posted my aadhaar number and bank details on a forum', labels: ['doxxing'] },
  { text: 'My address and workplace were leaked to my family and my employer', labels: ['doxxing'] },
  { text: 'A public post contains my address, my photo and my family details', labels: ['doxxing', 'impersonation'] },
  { text: 'They circulated my phone number to everyone in my locality', labels: ['doxxing', 'harassment'] },
  { text: 'My id proof and passport scan was leaked online', labels: ['doxxing', 'account_takeover'] },

  // ---------- misinformation ----------
  { text: 'A video is claiming that I am a scammer and it has gone viral', labels: ['misinformation', 'defamation'] },
  { text: 'Fake news is spreading that my shop sold adulterated food', labels: ['misinformation', 'defamation'] },
  { text: 'A viral rumour says I am missing and my family is searching for me', labels: ['misinformation'] },
  { text: 'Someone edited my interview video to make it look like I confessed to fraud', labels: ['misinformation', 'defamation'] },
  { text: 'False information about my business is being shared on whatsapp groups', labels: ['misinformation'] },
  { text: 'A page is spreading a false story that I attacked a colleague', labels: ['misinformation', 'defamation'] },

  // ---------- defamation ----------
  { text: 'He is telling everyone at my office that I stole money from the company', labels: ['defamation'] },
  { text: 'A blog called me a thief and ruined my professional reputation', labels: ['defamation'] },
  { text: 'They spread lies about my character in my neighbourhood group', labels: ['defamation', 'misinformation'] },
  { text: 'The news channel broadcast that my restaurant serves fake food without checking', labels: ['defamation', 'misinformation'] },
  { text: 'A rival is sending letters to my clients saying I am fraudulent', labels: ['defamation', 'financial_fraud'] },
  { text: 'My name was attached to a fake loan default list', labels: ['defamation', 'impersonation'] },

  // ---------- child safety ----------
  { text: 'A minor in my class is being targeted with obscene messages', labels: ['child_safety', 'harassment'] },
  { text: 'My 14 year old brother received threats from an unknown number', labels: ['child_safety', 'harassment'] },
  { text: 'Child abuse material of a minor is being sold on telegram channels', labels: ['child_safety'] },
  { text: 'An adult in my coaching class is messaging underage students', labels: ['child_safety'] },
  { text: 'My school student was sent graphic images by a stranger', labels: ['child_safety', 'harassment'] },
  { text: 'A child in my neighbourhood is being cyberbullied daily', labels: ['child_safety', 'harassment'] },

  // ---------- account takeover ----------
  { text: 'Someone logged into my email and changed my password', labels: ['account_takeover'] },
  { text: 'My instagram was hacked and the hacker is messaging my friends for money', labels: ['account_takeover', 'financial_fraud'] },
  { text: 'I got an otp that I never requested and my whatsapp is now controlled', labels: ['account_takeover'] },
  { text: 'Unknown device login appeared in my account activity list', labels: ['account_takeover'] },
  { text: 'My email was hacked and they sent fake invoices from my address', labels: ['account_takeover', 'financial_fraud'] },
  { text: 'My phone number was ported without my consent and now I cannot receive otp', labels: ['account_takeover'] },

  // ---------- sextortion ----------
  { text: 'Someone is threatening to leak my private photos unless I pay them', labels: ['sextortion', 'image_misuse'] },
  { text: 'I received an blackmail message demanding money for my intimate pictures', labels: ['sextortion'] },
  { text: 'He has my nudes and is extorting money from me every week', labels: ['sextortion', 'financial_fraud'] },
  { text: 'A stranger is blackmailing me with nude pictures taken from my camera', labels: ['sextortion'] },
  { text: 'They said they will post my private photos to my family unless I pay', labels: ['sextortion', 'image_misuse'] },

  // ---------- counterfeit ----------
  { text: 'A seller is selling fake branded shoes that look exactly like the real ones', labels: ['counterfeit'] },
  { text: 'The invoice from that company is fake and the business does not exist', labels: ['counterfeit', 'financial_fraud'] },
  { text: 'I received a replica bag claiming it is genuine', labels: ['counterfeit'] },
  { text: 'A website is selling counterfeit medicine with my chemist licence name', labels: ['counterfeit', 'impersonation'] },
  { text: 'This company is a fake business that collects application fees', labels: ['counterfeit', 'financial_fraud'] },

  // ---------- romance scam ----------
  { text: 'I met a person online who proposed marriage and then asked me for money', labels: ['romance_scam', 'financial_fraud'] },
  { text: 'We talked every day for a year and he says he is a pilot but he is a catfish', labels: ['romance_scam'] },
  { text: 'My online boyfriend asked me for a gift card and disappeared', labels: ['romance_scam', 'financial_fraud'] },
  { text: 'She catfishd me on instagram and took my money for a fake investment', labels: ['romance_scam', 'financial_fraud'] },
  { text: 'A dating app match is asking for my bank details claiming it is a visa fee', labels: ['romance_scam', 'financial_fraud'] },

  // ---------- second wave: more phrasings, more edge cases ----------
  { text: 'There is a duplicate of my account on another app that has stolen my profile picture', labels: ['impersonation', 'image_misuse'] },
  { text: 'Someone made a fake page in my name and is collecting money for charity', labels: ['impersonation', 'financial_fraud'] },
  { text: 'A random person is using my name and photo to sell courses online', labels: ['impersonation', 'counterfeit'] },
  { text: 'My face was used to make a page for a fake clothing brand', labels: ['impersonation', 'image_misuse', 'counterfeit'] },
  { text: 'A verified-looking account with my name is asking my contacts for OTPs', labels: ['impersonation', 'account_takeover'] },
  { text: 'They cloned my whole profile on a dating app and are asking for money', labels: ['impersonation', 'romance_scam'] },
  { text: 'My name is on a fake scholarship page asking students to pay a fee', labels: ['impersonation', 'counterfeit'] },

  { text: 'I was tricked into paying a registration fee of three thousand for a job that does not exist', labels: ['financial_fraud', 'counterfeit'] },
  { text: 'The customer support agent on a call asked for my OTP and money left my account', labels: ['financial_fraud', 'account_takeover'] },
  { text: 'I paid a fake landlord the deposit for a flat that does not exist', labels: ['financial_fraud', 'counterfeit'] },
  { text: 'Four lakhs were withdrawn from my account by someone in another state', labels: ['financial_fraud', 'account_takeover'] },
  { text: 'I bought a used phone from a marketplace and the seller vanished after the transfer', labels: ['financial_fraud', 'counterfeit'] },
  { text: 'A fake insurance company is holding my premium and will not return the money', labels: ['financial_fraud'] },
  { text: 'Someone promised me a job and asked for a refundable security deposit of 15000', labels: ['financial_fraud', 'counterfeit'] },
  { text: 'My money was withdrawn by a fraudulent UPI collect request I accepted by mistake', labels: ['financial_fraud'] },

  { text: 'A reel of my private conversation was posted without blurring my face', labels: ['image_misuse'] },
  { text: 'They printed my wedding photo on a card and are selling it', labels: ['image_misuse'] },
  { text: 'My photos were used in a dating ad without my permission', labels: ['image_misuse'] },
  { text: 'Someone made a deepfake of me saying things I never said and it is on youtube', labels: ['image_misuse', 'misinformation'] },
  { text: 'A page is using my old profile picture to promote a forex trading scheme', labels: ['image_misuse', 'financial_fraud'] },
  { text: 'My photo from a college fest is on a website selling my personal data', labels: ['image_misuse', 'doxxing'] },

  { text: 'A man keeps following me in the college canteen and messaging my friends about me', labels: ['stalking', 'harassment'] },
  { text: 'My location is being tracked by a hidden app on my phone', labels: ['stalking', 'account_takeover'] },
  { text: 'He waits near my building every evening and takes photos of me', labels: ['stalking', 'harassment'] },
  { text: 'Someone keeps sending my exact location to my family in a group', labels: ['stalking', 'doxxing'] },

  { text: 'A group of people in a school group chat are targeting me with abusive messages daily', labels: ['harassment'] },
  { text: 'My boss is sending me abusive messages after hours and threatening to report me falsely', labels: ['harassment', 'defamation'] },
  { text: 'I get abusive voice notes from an unknown number every night', labels: ['harassment'] },
  { text: 'Someone keeps commenting hate on every photo of me and my sister', labels: ['harassment', 'hate_speech'] },
  { text: 'A troll account is impersonating me and sending abusive messages to my employer', labels: ['impersonation', 'harassment'] },

  { text: 'People are posting that my community is responsible for every crime in the city', labels: ['hate_speech', 'misinformation'] },
  { text: 'A video is calling transgender people a disease and naming my city', labels: ['hate_speech'] },
  { text: 'The comment section is full of slurs aimed at my religion', labels: ['hate_speech', 'harassment'] },
  { text: 'My employer circulated a sheet saying people of my caste should be replaced', labels: ['hate_speech', 'defamation'] },

  { text: 'A website published my home address along with my photo and my phone number', labels: ['doxxing', 'image_misuse'] },
  { text: 'My aadhaar and bank passbook photos are circulating in a loan app group', labels: ['doxxing'] },
  { text: 'My workplace and my photo were posted by a neighbour on a public page', labels: ['doxxing', 'harassment'] },
  { text: 'Someone is selling my address and phone number on a people search site', labels: ['doxxing', 'stalking'] },

  { text: 'A false story about my family is being shared in a parents group', labels: ['misinformation', 'defamation'] },
  { text: 'An edited clip makes it look like I approved a scam scheme', labels: ['misinformation', 'image_misuse'] },
  { text: 'A viral post says I was arrested and I have never been to a police station', labels: ['misinformation', 'defamation'] },

  { text: 'A former client is telling people I cheated them out of my fees', labels: ['defamation'] },
  { text: 'Someone printed a leaflet naming me a cheat and distributed it in my society', labels: ['defamation', 'doxxing'] },
  { text: 'A review site says my business is a fraud and my name is attached to fake invoices', labels: ['defamation', 'financial_fraud'] },

  { text: 'A stranger in a game chat started talking to my 12 year old sister', labels: ['child_safety'] },
  { text: 'I found explicit images of a child from my area on a file sharing site', labels: ['child_safety'] },
  { text: 'An older man is sending my little brother inappropriate messages on a game', labels: ['child_safety', 'harassment'] },

  { text: 'My account was taken over and the hacker changed my email password and my phone', labels: ['account_takeover'] },
  { text: 'Someone reset my password through the customer support chat and got into my cloud drive', labels: ['account_takeover'] },
  { text: 'There is a login from a laptop in another city on my account activity', labels: ['account_takeover'] },
  { text: 'My facebook was hacked and they are posting scam links to my friends', labels: ['account_takeover', 'financial_fraud'] },

  { text: 'He is going to release my private pictures to my family unless I pay him', labels: ['sextortion', 'image_misuse'] },
  { text: 'Someone is selling my leaked photos on a telegram channel for money', labels: ['sextortion', 'image_misuse'] },
  { text: 'I paid the blackmailer twice and he still has my photos', labels: ['sextortion', 'financial_fraud'] },

  { text: 'A website is selling fake AirPods that look identical to the real ones', labels: ['counterfeit'] },
  { text: 'A company with a fake GST number issued me an invoice for services that never happened', labels: ['counterfeit', 'financial_fraud'] },
  { text: 'They are selling replica designer bags at a fraction of the price', labels: ['counterfeit'] },
  { text: 'A fake ngo is collecting donations in my old company name', labels: ['counterfeit', 'impersonation'] },

  { text: 'A man on instagram got close to me for six months and then asked for a loan of a lakh', labels: ['romance_scam', 'financial_fraud'] },
  { text: 'The girl I was talking to for a year turned out to be a fake profile run by a group', labels: ['romance_scam', 'impersonation'] },
  { text: 'He said he was in the navy abroad and needed money for a emergency flight ticket', labels: ['romance_scam', 'financial_fraud'] },

  // ---------- third wave: volume, phrasing diversity, hard cases ----------
  { text: 'A man on a dating app has been messaging me for weeks and now wants me to transfer money to a "friend"', labels: ['romance_scam', 'financial_fraud'] },
  { text: 'My online boyfriend of two years suddenly needs a loan for his sisters surgery', labels: ['romance_scam', 'financial_fraud'] },
  { text: 'She on instagram said she is a nurse in dubai and asked for gift cards to pay a deposit', labels: ['romance_scam', 'financial_fraud'] },
  { text: 'I met a person on a dating app who is using a stolen identity to chat with me', labels: ['romance_scam', 'impersonation'] },
  { text: 'A catfish on telegram promised to double my crypto if I deposit more', labels: ['romance_scam', 'financial_fraud'] },
  { text: 'He proposed to me over video call and the next day asked for money for a visa', labels: ['romance_scam', 'financial_fraud'] },
  { text: 'We met on a matrimonial site and he has been asking for money for a business deal', labels: ['romance_scam', 'financial_fraud'] },

  { text: 'My old classmate keeps posting passive aggressive comments about me under every photo', labels: ['harassment'] },
  { text: 'A woman from my office keeps messaging me at 2am with abusive and sexual messages', labels: ['harassment'] },
  { text: 'The neighbours have been abusing me verbally every morning for weeks', labels: ['harassment'] },
  { text: 'Someone keeps leaving threatening notes on my car in the parking lot', labels: ['harassment', 'stalking'] },
  { text: 'I am being cyberbullied by an anonymous account that knows my class schedule', labels: ['harassment', 'stalking'] },
  { text: 'A stranger keeps sending me abusive messages after I rejected him', labels: ['harassment'] },
  { text: 'My entire team is being targeted with abusive comments by a troll under my posts', labels: ['harassment'] },
  { text: 'He threatens to tell my parents about me if I do not meet him', labels: ['harassment', 'sextortion'] },

  { text: 'A page is sharing a fake screenshot of a message where I supposedly confessed to a crime', labels: ['misinformation', 'defamation'] },
  { text: 'Someone is spreading a voice note claiming I am planning to cheat on my wife', labels: ['misinformation', 'defamation'] },
  { text: 'A rumour is going around in my society that I was caught stealing', labels: ['misinformation', 'defamation'] },
  { text: 'An AI generated video claims I am endorssing a scam product and it is on instagram', labels: ['misinformation', 'image_misuse'] },
  { text: 'Wrong information about my medical condition is being spread in my family group', labels: ['misinformation'] },
  { text: 'Someone posted an old photo of me and claimed it was taken at a protest I never joined', labels: ['misinformation', 'image_misuse'] },

  { text: 'A former employer is telling my new employer that I was arrested for fraud', labels: ['defamation'] },
  { text: 'The building owner has put up a notice calling me a thief in front of the whole society', labels: ['defamation'] },
  { text: 'A journalist wrote that my company launders money and published my photo', labels: ['defamation', 'misinformation'] },
  { text: 'People in my profession group chat are saying I am professionally dishonest', labels: ['defamation'] },
  { text: 'My name is on a website listing me as a fraudster with my phone number', labels: ['defamation', 'doxxing'] },
  { text: 'A competitor is writing fake reviews saying I am a fraud to destroy my business', labels: ['defamation'] },

  { text: 'Someone accessed my laptop and read all my messages while I was at college', labels: ['account_takeover'] },
  { text: 'My instagram password was changed and the recovery email is also changed', labels: ['account_takeover'] },
  { text: 'The hacker is using my email to send fake job offers with malware', labels: ['account_takeover'] },
  { text: 'A scammer phoned me pretending to be the bank and got my net banking password', labels: ['account_takeover', 'financial_fraud'] },
  { text: 'My google account was hacked and there is a new recovery phone number', labels: ['account_takeover'] },
  { text: 'Someone logged into my net banking and tried to add a new beneficiary', labels: ['account_takeover', 'financial_fraud'] },

  { text: 'The shoes I got are replicas and the seller refused to accept a return', labels: ['counterfeit'] },
  { text: 'A restaurant is using my restaurant name on a different location and a different owner', labels: ['counterfeit', 'impersonation'] },
  { text: 'A website is selling fake covid medicine certificates to students', labels: ['counterfeit'] },
  { text: 'An online store took my money for a phone that turned out to be a fake brand', labels: ['counterfeit', 'financial_fraud'] },
  { text: 'Someone is selling a fake driving licence template website to students', labels: ['counterfeit'] },

  { text: 'My full name, photo and address were posted in a group meant to shame people who left the city', labels: ['doxxing', 'harassment'] },
  { text: 'A website has my phone number next to my photo and a list of my relatives', labels: ['doxxing'] },
  { text: 'Someone shared my home address in a housing group chat in my city', labels: ['doxxing'] },
  { text: 'My employer id and my car number plate were posted online with a warning message', labels: ['doxxing', 'harassment'] },
  { text: 'A person I blocked published my personal details on a page for local buyers', labels: ['doxxing'] },

  { text: 'A man in my coaching class keeps asking my 15 year old sister to come with him', labels: ['child_safety', 'harassment'] },
  { text: 'I found a video of a minor being abused being shared in a private telegram group', labels: ['child_safety'] },
  { text: 'An adult is trying to befriend my child in an online game', labels: ['child_safety'] },
  { text: 'A stranger sent my 13 year old cousin inappropriate pictures and demands money', labels: ['child_safety', 'sextortion'] },
  { text: 'Someone is grooming a child in our apartment society group', labels: ['child_safety'] },

  { text: 'A fake ngo sent me a fake donation request in the name of my old school', labels: ['counterfeit', 'financial_fraud'] },
  { text: 'Someone made a fake id of me and tried to get a loan in my name', labels: ['impersonation', 'financial_fraud'] },
  { text: 'A page copied my business logo and is selling counterfeit products with my name on them', labels: ['counterfeit', 'impersonation', 'image_misuse'] },
  { text: 'My father name is being used on a fake loan app profile', labels: ['impersonation', 'financial_fraud'] },
  { text: 'Someone is running a fake consultancy with my qualification certificates', labels: ['impersonation', 'counterfeit'] },

  { text: 'I was catfished on instagram and the person had stolen photos from a model', labels: ['impersonation', 'romance_scam'] },
  { text: 'A fake fashion brand page posted my photo in a campaign without asking', labels: ['image_misuse', 'counterfeit'] },
  { text: 'A public figure photo was photoshopped with my face on it and it is shared everywhere', labels: ['image_misuse', 'misinformation'] },
  { text: 'My photo was turned into a meme about a politician and it is going around', labels: ['image_misuse', 'misinformation'] },

  { text: 'A man has been standing near my gate and asking the watchman about my schedule', labels: ['stalking', 'harassment'] },
  { text: 'My ex keeps changing her number and sending me the same abusive messages', labels: ['harassment', 'stalking'] },
  { text: 'Someone is sending my daily routine photos back to me which means they watch me', labels: ['stalking'] },
  { text: 'A colleague is using a hidden camera app and sending me photos of my desk', labels: ['stalking', 'image_misuse'] },

  { text: 'I got a call from someone claiming to be from the income tax department asking for my otp', labels: ['financial_fraud', 'account_takeover'] },
  { text: 'A fake bank sms asked me to share the pin and my account was emptied', labels: ['financial_fraud', 'account_takeover'] },
  { text: 'I paid a fake covid test certificate seller and they never sent the file', labels: ['financial_fraud', 'counterfeit'] },
  { text: 'Someone promised me a job at a fake company and took my documents and money', labels: ['financial_fraud', 'counterfeit', 'doxxing'] },
  { text: 'A landlord asked for a fake agreement and my money is with them', labels: ['financial_fraud'] },
  { text: 'My father was scammed of his pension money by a fake government portal', labels: ['financial_fraud', 'impersonation'] },
  { text: 'I lost eight lakhs in a matrimony website investment plan', labels: ['financial_fraud', 'romance_scam'] },
  { text: 'A man claiming to be from the electricity board asked me to pay a fine online', labels: ['financial_fraud'] },
  { text: 'The seller of a second hand laptop asked me to pay a courier fee and vanished', labels: ['financial_fraud'] },
  { text: 'A gym membership fraud took my auto debit for six months after I cancelled', labels: ['financial_fraud'] },
];

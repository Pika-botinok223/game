// All spoken lines. voice: speaker id -> pitch/rate/colour; `chime` plays the PA ding-dong first.
export const SPEAKERS = {
  varga:    { name: 'Dr. Varga',     color: '#7fd4ff', pitch: 1.25, rate: 1.0,  gender: 'f' },
  brooks:   { name: 'Officer Brooks', color: '#8fb0ff', pitch: 0.75, rate: 0.98, gender: 'm' },
  pa:       { name: 'PA Announcer',  color: '#ffa04a', pitch: 1.05, rate: 0.9,  gender: 'robot' },
  overseer: { name: 'The Overseer',  color: '#d8d8d8', pitch: 0.45, rate: 0.72, gender: 'm' },
  alan:     { name: 'Alan',          color: '#ffffff', pitch: 1.0,  rate: 1.0,  gender: 'm' },
};

export const LINES = {
  // ---- chapter 1
  pa_welcome: { who: 'pa', chime: true, text: 'Good morning, and welcome to the Ave Maria Launch Complex. Today is launch day. Today is also a regular working day. Please do not confuse the two.' },
  pa_tram1: { who: 'pa', text: 'Please keep all hands, arms and personal belongings inside the tram at all times. The management is not responsible for lost limbs, lost hopes or lost luggage.' },
  pa_silo: { who: 'pa', chime: true, text: 'To your left: the Cell Containment Silos. The Cells are perfectly safe. Please do not tap on the glass. Please do not feed the Cells.' },
  pa_lore: { who: 'pa', text: 'A reminder: the deep mantle is cooling, the magnetic field is failing, and the Ave Maria Program is humanity\'s best answer. Enjoy your shift.' },
  pa_vab: { who: 'pa', chime: true, text: 'Now passing the Vehicle Assembly Building, where the DX-90 was assembled under budget. Mostly.' },
  pa_pad: { who: 'pa', text: 'Ahead, Pad Thirty-Nine. The DX-90 and its reusable Gabriel booster are fuelled and awaiting launch. Mister Mercer, please report to Sector C. Your locker is, as always, locker thirteen.' },
  pa_arrive: { who: 'pa', chime: true, text: 'Arriving at Sector C. Please mind the gap. And the Cells.' },
  varga_welcome: { who: 'varga', text: 'Alan, it\'s Ilse Varga. Good, you\'re on time. Grab your E.V.A. suit from the locker room, then come and find me in Lab C-4. One last calibration test.' },
  varga_suit: { who: 'varga', text: 'Suit on? Good. Say hello to Officer Brooks on your way through. He\'s been asking about you.' },
  brooks_1: { who: 'brooks', text: 'Hey, Mercer. You owe me a coffee.' },
  brooks_2: { who: 'brooks', text: 'Big day. Try not to break anything before the launch, alright?' },
  brooks_3: { who: 'brooks', text: 'Dr. Varga\'s waiting for you in Lab C-4. Through the doors on your left. Go on.' },
  brooks_again: { who: 'brooks', text: 'Still here, Mercer. Still owed a coffee.' },

  // ---- chapter 2
  varga_c4_1: { who: 'varga', text: 'Alan. Wheel the sample cart into the resonance chamber. Gently, please. That is a living Cell core, and it is the only one we have.' },
  varga_c4_2: { who: 'varga', text: 'Perfect. Now go through to the control room and press the big red button. HALO fires a single tuned pulse at the sample. Ten seconds. Nothing can possibly go wrong.' },
  varga_c4_3: { who: 'varga', text: 'Resonance is climbing... that isn\'t in the model. Alan, it\'s responding! It\'s... answering us!' },
  pa_breach: { who: 'pa', chime: true, text: 'Attention all personnel. This is not a drill. This... is... not... a... drill. Please remain calm and avoid the floor.' },
  varga_c4_4: { who: 'varga', text: 'Alan! They are coming up through the floor! The maintenance locker, grab the wrench and get out of there! Meet me at the maintenance bay!' },
  varga_c4_5: { who: 'varga', text: 'Go, go! Through the north door, then follow the service corridors down.' },

  // ---- chapter 3
  varga_c3_1: { who: 'varga', text: 'The Cells are waking everywhere, Alan. The only way is up: Pad 39. HALO can still end this, but someone has to launch it. That someone is you.' },
  varga_c3_2: { who: 'varga', text: 'In the maintenance bay there should be an M-7 Field Manipulator. It\'s an old cargo tool. Find it.' },
  varga_c3_3: { who: 'varga', text: 'That\'s the M-7. Left click to punt, right click to grab and hold. It lifts almost anything, and the Cells hate being hit by anything.' },
  varga_c3_4: { who: 'varga', text: 'Clear the barricade, Alan. Grab each crate and put it somewhere else.' },
  varga_c3_5: { who: 'varga', text: 'The catwalk is out of reach. Stack the crates. Grab one, drop it, then grab another and put it on top.' },
  varga_c3_6: { who: 'varga', text: 'That door is dead without a fuse cell. There\'s one across the pit. Use the manipulator to pull it over, then drop it in the socket.' },
  varga_c3_7: { who: 'varga', text: 'Those are Cell nests. They\'ll spawn crawlers until they\'re destroyed. Explosive barrels, Alan. Grab one and throw it.' },
  varga_c3_8: { who: 'varga', text: 'The nests are down. That\'s the way up to the surface. Pad 39 is on the far side. Hurry.' },
  pa_c3: { who: 'pa', text: 'Attention. Please remain calm. Please remain. Calm.' },

  // ---- chapter 4
  pa_c4: { who: 'pa', chime: true, text: 'Automated propellant loading has been suspended. Manual intervention is required at three valves. Thank you for your cooperation.' },
  varga_c4a: { who: 'varga', text: 'Alan, the automated fuel lines are locked. Open the three propellant valves by hand: they\'re around the pad. The Cells are swarming, so move fast.' },
  varga_v1: { who: 'varga', text: 'One down. Keep going.' },
  varga_v2: { who: 'varga', text: 'Two. One more, Alan.' },
  varga_v3: { who: 'varga', text: 'That\'s all three. Fuel is flowing. Take the tower elevator up to the crew access arm.' },
  varga_lift: { who: 'varga', text: 'I\'m sending the lift. Hold on to something.' },
  varga_top: { who: 'varga', text: 'The hatch is open. Get inside, strap in, and press LAUNCH on the main console. Godspeed, Alan.' },
  pa_launch: { who: 'pa', text: 'Launch sequence initiated.' },
  varga_lift_off: { who: 'varga', text: 'We have liftoff! Gabriel is burning clean. Hold on...' },
  varga_sep: { who: 'varga', text: 'Stage separation. Look at Gabriel go. She\'s flipping, she\'s going home.' },
  varga_land: { who: 'varga', text: 'And Gabriel is back on the pad. Standing. Beautiful.' },
  varga_orbit: { who: 'varga', text: 'Orbit. Deploying the HALO Array. Alan... thank you.' },
  overseer_end: { who: 'overseer', text: 'Prepare for... re-entry, Mr. Mercer.' },
};

export const CHAPTERS = [
  { num: 1, title: 'Ave Maria Inbound' },
  { num: 2, title: 'Core Sample' },
  { num: 3, title: 'Containment Failure' },
  { num: 4, title: 'Pad 39' },
];

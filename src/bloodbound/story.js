// Spoken lines, in story order. When each is said is up to the player; see director.js.
export const dialogue = [
  { id: 'hunter-warning', speaker: 'Hunter', text: "He won't make it in time.", translation: '他来不及救你了。' },
  { id: 'lucien-warning', speaker: 'Lucien', text: 'Don’t. Touch. Her.', translation: '别。碰。她。' },
  { id: 'bleeding', speaker: 'Lucien', text: 'You’re bleeding…', translation: '你流血了……' },
  { id: 'every-drop', speaker: 'Lucien', text: 'I can hear it. Every drop.', translation: '我听得见。每一滴。' },
  { id: 'lose-control', speaker: 'Lucien', text: 'Even if I lose control of everything else…', translation: '即使我失去对一切的控制……' },
  { id: 'protect', speaker: 'Lucien', text: 'I’ll never let anyone hurt you again.', translation: '我也绝不会再让任何人伤害你。' },
  { id: 'not-me', speaker: 'Lucien', text: 'Not even me.', translation: '哪怕那个人是我。' },
];
// Unspoken narration over what the player only sees: no voice, no speaker, shown at the moments named in director.js.
export const narration = [
  { id: 'arrival', text: 'After a desperate search, Lucien, the vampire, finally finds the hidden place where the hunters have been holding you captive.', translation: '吸血鬼 Lucien 历尽千辛万苦，终于找到了猎人囚禁你的藏匿之处。' },
  { id: 'fangs', text: 'His fangs come down. He wants your blood.', translation: '他的獠牙露了出来——他渴望你的血。' },
  { id: 'restraint', text: 'He closes his eyes, and holds the hunger back.', translation: '他闭上眼，把那份渴望压了回去。' },
  { id: 'pour', text: 'Instead, he lets your blood fill an empty pendant.', translation: '他没有饮下，而是让你的血注满一枚空项链。' },
  { id: 'full', text: 'Now it holds you — and it is yours to wear.', translation: '从此，它盛着你，也归你佩戴。' },
];
export const line = id => dialogue.find(entry => entry.id === id);

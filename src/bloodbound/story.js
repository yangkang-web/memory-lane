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
export const line = id => dialogue.find(entry => entry.id === id);

# iPhone 12 Simulation Component

A high-fidelity simulation of an iPhone 12 messenger and call flow, built with React, Tailwind CSS, and Framer Motion.

## Features
- **Realistic iOS Messenger UI**: Complete with status bar, navigation header, and chat bubbles.
- **Interactive Typing**: Simulates typing a preset message by tapping any key on the virtual keyboard.
- **Incoming Call Flow**: Triggers an incoming call banner and full-screen call interface.
- **Smooth Transitions**: Uses Framer Motion for native-like animations.

## Usage

```tsx
import IPhoneSimulation from '@/sd-components/b09b7f75-dc35-4c38-a49a-87ccef23fa0e';

function App() {
  return (
    <div style={{ width: 390, height: 844 }}>
      <IPhoneSimulation />
    </div>
  );
}
```

## Interaction Flow
1. **Start**: Empty messenger input with keyboard open.
2. **Type**: Tap ANY key on the virtual keyboard to type the message "Bleib noch da und melde dich, falls Chris auftaucht."
3. **Send**: Tap the "Return" key or the send button to send the message.
4. **Trigger Call**: Tap the LOWER THIRD of the screen (empty space below messages).
5. **Answer/View Call**: The incoming call banner appears. Tap it to view the full-screen call.
6. **End**: The screen turns black after 2 seconds.

## Props
This component currently accepts no props as it is a self-contained simulation scenario.

import { useEffect } from 'react';
import { setSoundPrefs } from './lib/sound';
import { Toolbar } from './components/Toolbar';
import { BrushProvider } from './features/brush/BrushProvider';
import { TranslationPopover } from './features/brush/TranslationPopover';
import { ExamScreen } from './screens/ExamScreen';
import { HomeScreen } from './screens/HomeScreen';
import { PracticeScreen } from './screens/PracticeScreen';
import { ResultScreen } from './screens/ResultScreen';
import { ChapterScreen, TheoryScreen } from './screens/TheoryScreen';
import { FlashcardsScreen, VocabScreen } from './screens/VocabScreen';
import { AppProvider, useApp } from './state/AppState';

function CurrentScreen() {
  const { screen, visit } = useApp();
  switch (screen.name) {
    case 'exam': return <ExamScreen />;
    case 'result': return <ResultScreen />;
    case 'practice': return <PracticeScreen key={visit} screen={screen} />;
    case 'vocab': return <VocabScreen />;
    case 'flashcards': return <FlashcardsScreen key={visit} />;
    case 'theory': return <TheoryScreen />;
    case 'chapter': return <ChapterScreen key={visit} cat={screen.cat} />;
    default: return <HomeScreen />;
  }
}

function Layout() {
  const { data } = useApp();
  useEffect(() => {
    document.body.classList.remove('size-0', 'size-1', 'size-2');
    document.body.classList.add(`size-${data.prefs.size}`);
  }, [data.prefs.size]);
  useEffect(() => setSoundPrefs(data.prefs.sound, data.prefs.volume), [data.prefs.sound, data.prefs.volume]);

  return (
    <>
      <Toolbar />
      <main className="wrap" id="main" tabIndex={-1}><CurrentScreen /></main>
      <TranslationPopover />
    </>
  );
}

export default function App() {
  return (
    <AppProvider>
      <BrushProvider>
        <Layout />
      </BrushProvider>
    </AppProvider>
  );
}

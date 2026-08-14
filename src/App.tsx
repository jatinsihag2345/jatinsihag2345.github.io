import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { DSAHub } from './components/DSAHub';
import { SQLHub } from './components/SQLHub';
import { ProblemViewer } from './components/ProblemViewer';
import { SQLViewer } from './components/SQLViewer';
import { dsaQuestions } from './data/dsaQuestions';
import type { Question } from './data/dsaQuestions';
import { sqlQuestions } from './data/sqlQuestions';
import type { SQLQuestion } from './data/sqlQuestions';
import {
  STORAGE_KEYS,
  calculateCurrentStreak,
  markStudyDay,
  readStringArray,
  readStudyMeta,
  writeJson,
} from './utils/persistence';

function App() {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  
  // Selected Problem States
  const [selectedDsaQuestion, setSelectedDsaQuestion] = useState<Question | null>(null);
  const [selectedSqlQuestion, setSelectedSqlQuestion] = useState<SQLQuestion | null>(null);

  // User Progress States (Synced with LocalStorage)
  const [solvedDsaIds, setSolvedDsaIds] = useState<string[]>(() => {
    return readStringArray(STORAGE_KEYS.solvedDsaIds);
  });
  const [bookmarkedDsaIds, setBookmarkedDsaIds] = useState<string[]>(() => {
    return readStringArray(STORAGE_KEYS.bookmarkedDsaIds);
  });

  const [solvedSqlIds, setSolvedSqlIds] = useState<string[]>(() => {
    return readStringArray(STORAGE_KEYS.solvedSqlIds);
  });
  const [bookmarkedSqlIds, setBookmarkedSqlIds] = useState<string[]>(() => {
    return readStringArray(STORAGE_KEYS.bookmarkedSqlIds);
  });
  const [studyDays, setStudyDays] = useState<string[]>(() => readStudyMeta().studyDays);

  const streak = calculateCurrentStreak(studyDays);

  // Sync state changes to local storage
  useEffect(() => {
    writeJson(STORAGE_KEYS.solvedDsaIds, solvedDsaIds);
  }, [solvedDsaIds]);

  useEffect(() => {
    writeJson(STORAGE_KEYS.bookmarkedDsaIds, bookmarkedDsaIds);
  }, [bookmarkedDsaIds]);

  useEffect(() => {
    writeJson(STORAGE_KEYS.solvedSqlIds, solvedSqlIds);
  }, [solvedSqlIds]);

  useEffect(() => {
    writeJson(STORAGE_KEYS.bookmarkedSqlIds, bookmarkedSqlIds);
  }, [bookmarkedSqlIds]);

  useEffect(() => {
    writeJson(STORAGE_KEYS.studyMeta, { studyDays });
  }, [studyDays]);

  // Toggle handlers
  const handleToggleDsaSolved = (id: string) => {
    setSolvedDsaIds((prev) => {
      const wasSolved = prev.includes(id);
      if (!wasSolved) {
        setStudyDays((currentDays) => markStudyDay(currentDays));
      }

      return wasSolved ? prev.filter((item) => item !== id) : [...prev, id];
    });
  };

  const handleToggleDsaBookmark = (id: string) => {
    setBookmarkedDsaIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleToggleSqlSolved = (id: string) => {
    setSolvedSqlIds((prev) => {
      const wasSolved = prev.includes(id);
      if (!wasSolved) {
        setStudyDays((currentDays) => markStudyDay(currentDays));
      }

      return wasSolved ? prev.filter((item) => item !== id) : [...prev, id];
    });
  };

  const handleToggleSqlBookmark = (id: string) => {
    setBookmarkedSqlIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Navigating to detail clears other detail state to keep UI clean
  const handleTabChange = (tab: string) => {
    setCurrentTab(tab);
    setSelectedDsaQuestion(null);
    setSelectedSqlQuestion(null);
  };

  // Progress Calculations
  const dsaProgress = dsaQuestions.length > 0 ? (solvedDsaIds.length / dsaQuestions.length) * 100 : 0;
  const sqlProgress = sqlQuestions.length > 0 ? (solvedSqlIds.length / sqlQuestions.length) * 100 : 0;

  return (
    <div className="app-container">
      <Sidebar 
        currentTab={currentTab} 
        setCurrentTab={handleTabChange}
        dsaProgress={dsaProgress}
        sqlProgress={sqlProgress}
      />
      
      <main className="main-content">
        {currentTab === 'dashboard' && (
          <Dashboard 
            dsaProgress={dsaProgress}
            sqlProgress={sqlProgress}
            dsaSolvedCount={solvedDsaIds.length}
            dsaTotalCount={dsaQuestions.length}
            sqlSolvedCount={solvedSqlIds.length}
            sqlTotalCount={sqlQuestions.length}
            streak={streak}
            bookmarkCount={bookmarkedDsaIds.length + bookmarkedSqlIds.length}
            onNavigate={handleTabChange}
          />
        )}

        {currentTab === 'dsa' && (
          selectedDsaQuestion ? (
            <ProblemViewer 
              question={selectedDsaQuestion}
              onBack={() => setSelectedDsaQuestion(null)}
              solvedQuestionIds={solvedDsaIds}
              bookmarkedQuestionIds={bookmarkedDsaIds}
              onToggleSolved={handleToggleDsaSolved}
              onToggleBookmark={handleToggleDsaBookmark}
            />
          ) : (
            <DSAHub 
              solvedQuestionIds={solvedDsaIds}
              bookmarkedQuestionIds={bookmarkedDsaIds}
              onToggleSolved={handleToggleDsaSolved}
              onToggleBookmark={handleToggleDsaBookmark}
              onSelectQuestion={setSelectedDsaQuestion}
            />
          )
        )}

        {currentTab === 'sql' && (
          selectedSqlQuestion ? (
            <SQLViewer 
              question={selectedSqlQuestion}
              onBack={() => setSelectedSqlQuestion(null)}
              solvedSqlIds={solvedSqlIds}
              bookmarkedSqlIds={bookmarkedSqlIds}
              onToggleSolved={handleToggleSqlSolved}
              onToggleBookmark={handleToggleSqlBookmark}
            />
          ) : (
            <SQLHub 
              solvedSqlIds={solvedSqlIds}
              bookmarkedSqlIds={bookmarkedSqlIds}
              onToggleSolved={handleToggleSqlSolved}
              onToggleBookmark={handleToggleSqlBookmark}
              onSelectQuestion={setSelectedSqlQuestion}
            />
          )
        )}
      </main>
    </div>
  );
}

export default App;

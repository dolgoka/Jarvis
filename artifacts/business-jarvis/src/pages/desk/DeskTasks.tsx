/**
 * DeskTasks — reuses the existing DirectorBoardPage inside the Desk shell.
 * Phase 2: already functional via DirectorBoardPage.
 */
import DirectorBoardPage from "../tasks/DirectorBoardPage";

export default function DeskTasks() {
  return (
    <div style={{ minHeight: "100dvh" }}>
      <DirectorBoardPage />
    </div>
  );
}

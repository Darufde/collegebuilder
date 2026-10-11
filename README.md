# College Builder

A browser game where you run a college admissions office. Read applications, stamp decisions, and grow your school year after year.

## Play

Open `index.html` in any modern browser. There's no install or build step. Your game saves automatically in the browser's local storage. Use **Continue** on the main menu to pick up where you left off.

## How it works

1. **Main menu.** Start a new game, continue a saved one, or read how to play.
2. **Charter your school.** Choose a name, mascot, school colors, home state, and public or private.
   - Public schools charge in-state students less and get state funding.
   - Private schools charge everyone the same and get larger alumni donations.
3. **Admissions cycle.** Each year brings a new pool of applicants. Every application shows:
   - name and hometown
   - unweighted GPA and weighted GPA
   - AP classes with exam scores
   - SAT or ACT score (or test-optional)
   - intended major, sport and star rating, and activities
   - an Academic Index (0–100) and the chance they'll enroll if admitted

   Stamp each file **Admit**, **Waitlist** or **Deny**. You can also bulk-admit or bulk-deny by Academic Index.
4. **Manage the campus.**
   - **Majors**: open or close departments. Applicants whose major you don't offer rarely enroll.
   - **Sports**: launch or cut varsity programs. Admitted recruits make teams win, and wins bring revenue and prestige.
   - **Classes**: schedule seminars, standard sections or lecture halls. Every student needs 3 seats. Running short makes students leave. Small classes raise prestige.
5. **End the season.** Admitted students decide, the waitlist fills open spots, seniors graduate, teams play, the budget settles and prestige moves. Then the next cycle opens.

It's a sandbox. There's no game over, even if the budget goes negative.

### Keyboard shortcuts (in an open application)

| Key | Action |
| --- | --- |
| `A` | Admit |
| `W` | Waitlist |
| `D` | Deny |
| `←` / `→` | Previous / next file |
| `Esc` | Close |

## Code layout

- `index.html`: page shell
- `css/style.css`: all styling, with light and dark themes
- `js/data.js`: catalogs of states, names, AP courses, majors, sports and class formats
- `js/game.js`: game state, applicant generation, and the yearly simulation
- `js/ui.js`: screens, rendering and input handling

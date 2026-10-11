# College Builder

A browser game where you run a college admissions office. Read applications, stamp decisions, and grow your school year after year.

## Play

Open `index.html` in any modern browser. There's no install or build step. Your game saves automatically in the browser's local storage. Use **Continue** on the main menu to pick up where you left off.

## How it works

1. **Main menu.** Start a new game, continue a saved one, or read how to play.
2. **Charter your school.** Choose a name, mascot, school colors, home state, and public or private.
   - Public schools start with cheaper in-state tuition and get state funding for every in-state student.
   - Private schools start with one price for everyone, larger alumni donations and a bigger aid budget.
3. **Admissions cycle.** Each year brings a new pool of applicants. Every application shows:
   - name, hometown, gender, and whether they're in-state, out-of-state or international
   - unweighted GPA and weighted GPA, AP classes with exam scores, SAT or ACT (or test-optional)
   - intended major, sport and star rating, and activities (each feeds a part of campus life)
   - family income, what the family can pay, first-generation and legacy status, and interest in Greek life
   - any standout talent (National Merit Scholar, startup founder, social media creator, junior national athlete...) or a disciplinary record
   - an Academic Index (0–100), the aid package, and the chance they'll enroll if admitted

   Stamp each file **Admit**, **Waitlist** or **Deny**, and offer individual scholarships. Filter the pool by in-state, out-of-state, international, women, men, athletes, standouts, legacies, first-gen and more. Bulk tools (admit by index, admit the top N, deny below an index) apply to whatever view you're in.
4. **Applications grow with your school.** Prestige, the number of majors, campus life, buzz from your students' headlines, your alumni network, net price and housing all multiply interest. There's no ceiling: pools grow into the thousands and keep going.
5. **Your students shape the school.**
   - Their activities build campus life: leadership, arts, service, research, media and the social scene, plus Greek life, school spirit, housing and diversity.
   - Standouts make news every year: fellowships, published research, viral videos, national titles, big family gifts, or arrests and scandals.
   - Graduates join the alumni network and give back every year. Greek members, wealthy families and founders give the most.
6. **Run the campus.**
   - **Majors**: 77 majors across 8 areas. Each draws its own mix of men and women, so your catalog shapes your gender balance.
   - **Classes**: pick a department and add seminar, standard or lecture-hall sections course by course. Every student needs 3 seats, one in their own department. Short departments lose students.
   - **Students**: campus life scores, gender and residency mix, home states, standout students and notable alumni.
   - **Housing**: build residence halls. Freshmen must live on campus; upperclassmen choose based on price and quality. Run out of beds and yield, retention and your reputation suffer.
   - **Greek life**: charter fraternities and sororities, build chapter houses, and set oversight from strict to hands-off. More members means more spirit and alumni giving, and more risk of hazing scandals.
   - **Sports**: launch or cut varsity programs. Some recruit only men or only women.
   - **Tuition & aid**: set in-state and out-of-state tuition, room and board, the share of need you meet, and merit scholarships. See the net price for every income bracket.
7. **End the season.** Admitted students decide, the waitlist fills open spots, seniors graduate, freshmen rush, teams play, your students make headlines, the budget settles and prestige moves. Then the next cycle opens.

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
- `js/data.js`: catalogs of states, names, AP courses, majors, sports, class formats, activities, standout talents, income brackets, residence halls and Greek chapters
- `js/game.js`: game state, applicant generation, campus metrics, and the yearly simulation. Applicant pools are saved as a seed plus your decisions, so large pools fit in browser storage
- `js/ui.js`: screens, rendering and input handling

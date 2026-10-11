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
   - name, hometown, gender, and whether they're in-state, out-of-state or international. Students come from 340+ cities across all 50 states, DC and Puerto Rico (weighted by population) and 160+ cities in 47 countries, with names from their home country
   - unweighted GPA, weighted GPA (built from their finished APs and honors classes), AP classes with exam scores (senior-year APs show as in progress), SAT or ACT (or test-optional). Grades, test scores and AP scores line up with each other
   - intended major, sport and star rating, and activities (each feeds a part of campus life)
   - family income, what the family can pay, first-generation and legacy status, and interest in Greek life
   - any standout talent (National Merit Scholar, startup founder, social media creator, junior national athlete...) or a disciplinary record
   - an Academic Index (0–100), the aid package, and the chance they'll enroll if admitted

   Stamp each file **Admit**, **Waitlist** or **Deny** from the folder or with the A/W/D buttons on each row. The folder jumps straight to the next pending file after each decision. Filter the pool by in-state, out-of-state, international, women, men, athletes, standouts, legacies, first-gen and more. Bulk tools (admit by index, admit the top N, waitlist by index, waitlist all the rest, deny below an index) apply to whatever view you're in.
4. **Early round.** If you offer Early Decision or Early Action (set in Office, takes effect next cycle), each cycle opens with just the early applicants. Admit, defer or deny them, then **Send early decisions**:
   - Early Decision is binding: admits commit and claim a seat, unless their aid package leaves the family short.
   - Early Action admits aren't bound but are more likely to say yes.
   - Deferred students rejoin the regular pool, which opens with everyone else. Early decisions can't be changed afterward.
5. **Recruiting & staff.**
   - Hire admissions readers (600 files each per cycle) and set their rules: admit above an index, waitlist or defer above another, admit strong recruits, flag or admit standouts, deny or flag disciplinary records, and stop admitting once the class is full. Send them to work from Applications, and they can read leftover files at the end of the season.
   - Spend on marketing (more applicants, no cap), athletic recruiting (more and better recruits), and campaigns in specific states and countries.
6. **Applications grow with your school.** Prestige, the number of majors, campus life, buzz from your students' headlines, your alumni network, net price and housing all multiply interest. There's no ceiling: pools grow into the thousands and keep going.
7. **Your students shape the school.**
   - Their activities build campus life: leadership, arts, service, research, media and the social scene, plus Greek life, school spirit, housing and diversity.
   - Standouts make news every year: fellowships, published research, viral videos, national titles, big family gifts, or arrests and scandals.
   - Each graduating class gets a graduation rate, job placement rate and starting salaries by major. Good outcomes raise prestige, draw applicants and increase alumni giving.
   - Graduates join the alumni network and give back every year. Higher earners, Greek members, wealthy families and founders give the most.
8. **Run the campus.**
   - **Majors**: 77 majors across 8 areas. Each draws its own mix of men and women, so your catalog shapes your gender balance.
   - **Classes**: pick a department and add seminar, standard or lecture-hall sections course by course. Every student needs 3 seats, one in their own department. Short departments lose students.
   - **Students**: campus life scores, gender and residency mix, home states, standout students and notable alumni.
   - **Housing**: build residence halls. Freshmen must live on campus; upperclassmen choose based on price and quality. Run out of beds and yield, retention and your reputation suffer.
   - **Greek life**: charter fraternities and sororities, build chapter houses, and set oversight from strict to hands-off. More members means more spirit and alumni giving, and more risk of hazing scandals.
   - **Sports**: launch or cut varsity programs, listed as men's, women's and co-ed. Men's and women's teams are separate programs and recruits only play for their own.
     - Move between Division III, II and I. Higher divisions need more programs, pay athletic scholarships and charge a membership fee with a transition period, but bring better recruits, more ticket money and exposure.
     - Join conferences with TV deals, win conference titles, make postseason runs and play rivalry games. Top conferences require prestige and a football program.
     - Title IX: if the share of women among your athletes drifts too far from your student body's, expect complaints, fines and investigations, and you can't move up a division.
   - **Tuition & aid**: set in-state and out-of-state tuition, room and board, and the share of need you meet. Merit scholarships are automatic: set tiers like "GPA 3.5+ gets $5,000 a year" or "out-of-state students with SAT 1400+ get $10,000" (GPA, weighted GPA, Academic Index, SAT or ACT, for everyone or a group), and each student gets the best award they qualify for. See the net price for every income bracket.
9. **End the season.** Admitted students decide, the waitlist fills open spots, seniors graduate, freshmen rush, teams play, your students make headlines, the budget settles and prestige moves. Then the next cycle opens.

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

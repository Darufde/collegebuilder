/* College Builder — static catalogs: places, names, majors, sports, classes. */
(function () {
  'use strict';

  // [code, name, cities]. The number of cities doubles as a rough population weight.
  const STATES = [
    ['AL', 'Alabama', ['Birmingham', 'Huntsville', 'Mobile']],
    ['AK', 'Alaska', ['Anchorage', 'Fairbanks']],
    ['AZ', 'Arizona', ['Phoenix', 'Tucson', 'Flagstaff']],
    ['AR', 'Arkansas', ['Little Rock', 'Fayetteville']],
    ['CA', 'California', ['Los Angeles', 'San Diego', 'Sacramento', 'Fresno', 'San Jose', 'Oakland']],
    ['CO', 'Colorado', ['Denver', 'Boulder', 'Colorado Springs']],
    ['CT', 'Connecticut', ['Hartford', 'New Haven', 'Stamford']],
    ['DE', 'Delaware', ['Wilmington', 'Dover']],
    ['FL', 'Florida', ['Miami', 'Tampa', 'Orlando', 'Jacksonville', 'Tallahassee']],
    ['GA', 'Georgia', ['Atlanta', 'Savannah', 'Athens', 'Macon']],
    ['HI', 'Hawaii', ['Honolulu', 'Hilo']],
    ['ID', 'Idaho', ['Boise', 'Idaho Falls']],
    ['IL', 'Illinois', ['Chicago', 'Springfield', 'Naperville', 'Peoria']],
    ['IN', 'Indiana', ['Indianapolis', 'Bloomington', 'Fort Wayne']],
    ['IA', 'Iowa', ['Des Moines', 'Iowa City', 'Cedar Rapids']],
    ['KS', 'Kansas', ['Wichita', 'Lawrence', 'Topeka']],
    ['KY', 'Kentucky', ['Louisville', 'Lexington', 'Bowling Green']],
    ['LA', 'Louisiana', ['New Orleans', 'Baton Rouge', 'Shreveport']],
    ['ME', 'Maine', ['Portland', 'Bangor']],
    ['MD', 'Maryland', ['Baltimore', 'Annapolis', 'Bethesda']],
    ['MA', 'Massachusetts', ['Boston', 'Worcester', 'Cambridge', 'Springfield']],
    ['MI', 'Michigan', ['Detroit', 'Ann Arbor', 'Grand Rapids', 'Lansing']],
    ['MN', 'Minnesota', ['Minneapolis', 'St. Paul', 'Duluth']],
    ['MS', 'Mississippi', ['Jackson', 'Oxford']],
    ['MO', 'Missouri', ['St. Louis', 'Kansas City', 'Columbia']],
    ['MT', 'Montana', ['Billings', 'Missoula', 'Bozeman']],
    ['NE', 'Nebraska', ['Omaha', 'Lincoln']],
    ['NV', 'Nevada', ['Las Vegas', 'Reno', 'Henderson']],
    ['NH', 'New Hampshire', ['Manchester', 'Concord']],
    ['NJ', 'New Jersey', ['Newark', 'Princeton', 'Jersey City', 'Trenton']],
    ['NM', 'New Mexico', ['Albuquerque', 'Santa Fe', 'Las Cruces']],
    ['NY', 'New York', ['New York City', 'Buffalo', 'Rochester', 'Albany', 'Syracuse']],
    ['NC', 'North Carolina', ['Charlotte', 'Raleigh', 'Durham', 'Asheville']],
    ['ND', 'North Dakota', ['Fargo', 'Bismarck']],
    ['OH', 'Ohio', ['Columbus', 'Cleveland', 'Cincinnati', 'Dayton']],
    ['OK', 'Oklahoma', ['Oklahoma City', 'Tulsa', 'Norman']],
    ['OR', 'Oregon', ['Portland', 'Eugene', 'Salem']],
    ['PA', 'Pennsylvania', ['Philadelphia', 'Pittsburgh', 'State College', 'Allentown']],
    ['RI', 'Rhode Island', ['Providence', 'Newport']],
    ['SC', 'South Carolina', ['Charleston', 'Columbia', 'Greenville']],
    ['SD', 'South Dakota', ['Sioux Falls', 'Rapid City']],
    ['TN', 'Tennessee', ['Nashville', 'Memphis', 'Knoxville', 'Chattanooga']],
    ['TX', 'Texas', ['Houston', 'Austin', 'Dallas', 'San Antonio', 'El Paso', 'Fort Worth']],
    ['UT', 'Utah', ['Salt Lake City', 'Provo', 'Ogden']],
    ['VT', 'Vermont', ['Burlington', 'Montpelier']],
    ['VA', 'Virginia', ['Richmond', 'Arlington', 'Norfolk', 'Charlottesville']],
    ['WA', 'Washington', ['Seattle', 'Spokane', 'Tacoma']],
    ['WV', 'West Virginia', ['Charleston', 'Morgantown']],
    ['WI', 'Wisconsin', ['Milwaukee', 'Madison', 'Green Bay']],
    ['WY', 'Wyoming', ['Cheyenne', 'Casper', 'Laramie']]
  ].map(([code, name, cities]) => ({ code, name, cities }));

  const INTERNATIONAL = [
    ['Toronto', 'Canada'], ['Vancouver', 'Canada'], ['Mexico City', 'Mexico'],
    ['London', 'United Kingdom'], ['Seoul', 'South Korea'], ['Mumbai', 'India'],
    ['Bengaluru', 'India'], ['Lagos', 'Nigeria'], ['São Paulo', 'Brazil'],
    ['Shanghai', 'China'], ['Berlin', 'Germany'], ['Manila', 'Philippines'],
    ['Sydney', 'Australia'], ['Nairobi', 'Kenya'], ['Hanoi', 'Vietnam']
  ];

  const FIRST_NAMES = [
    'Aaliyah', 'Aarav', 'Abigail', 'Aiden', 'Alejandro', 'Amara', 'Amelia', 'Andre', 'Ava', 'Benjamin',
    'Brianna', 'Caleb', 'Camila', 'Carter', 'Chloe', 'Daniel', 'Darius', 'Diego', 'Elena', 'Eli',
    'Emily', 'Ethan', 'Fatima', 'Gabriel', 'Grace', 'Hannah', 'Hiro', 'Isabella', 'Isaiah', 'Jacob',
    'Jada', 'Jamal', 'Jasmine', 'Javier', 'Jordan', 'Julian', 'Kai', 'Keisha', 'Leah', 'Liam',
    'Lucas', 'Luis', 'Maya', 'Mason', 'Mei', 'Mia', 'Mohammed', 'Naomi', 'Nathan', 'Nia',
    'Noah', 'Olivia', 'Omar', 'Owen', 'Priya', 'Quinn', 'Rafael', 'Riley', 'Rohan', 'Ruby',
    'Samuel', 'Sara', 'Sebastian', 'Sofia', 'Taylor', 'Theo', 'Valentina', 'Wei', 'Xavier', 'Yara',
    'Yusuf', 'Zoe', 'Zion', 'Harper', 'Elijah', 'Layla', 'Mateo', 'Nora', 'Ezra', 'Imani'
  ];

  const LAST_NAMES = [
    'Adams', 'Ahmed', 'Alvarez', 'Anderson', 'Baker', 'Bennett', 'Brooks', 'Brown', 'Campbell', 'Carter',
    'Chen', 'Clark', 'Cohen', 'Collins', 'Cruz', 'Davis', 'Diaz', 'Edwards', 'Evans', 'Fischer',
    'Flores', 'Foster', 'Garcia', 'Gonzalez', 'Gupta', 'Hall', 'Harris', 'Hernandez', 'Hughes', 'Ibrahim',
    'Jackson', 'Johnson', 'Jones', 'Kaur', 'Kim', 'Kowalski', 'Lee', 'Lewis', 'Lopez', 'Martin',
    'Martinez', 'Mitchell', 'Moore', 'Morales', 'Murphy', 'Nguyen', 'Okafor', 'Olsen', 'Ortiz', 'Park',
    'Patel', 'Perez', 'Phillips', 'Ramirez', 'Reed', 'Rivera', 'Roberts', 'Robinson', 'Rossi', 'Sanchez',
    'Santos', 'Schmidt', 'Shah', 'Singh', 'Smith', 'Sullivan', 'Tanaka', 'Taylor', 'Thomas', 'Thompson',
    'Torres', 'Tran', 'Turner', 'Walker', 'Washington', 'Watson', 'White', 'Williams', 'Wright', 'Young'
  ];

  // The College Board's current AP course names.
  const AP_COURSES = [
    'Calculus AB', 'Calculus BC', 'Precalculus', 'Statistics', 'Physics 1', 'Physics 2',
    'Physics C: Mechanics', 'Chemistry', 'Biology', 'Environmental Science', 'Computer Science A',
    'Computer Science Principles', 'English Language', 'English Literature', 'US History',
    'World History', 'European History', 'US Government', 'Comparative Government',
    'Macroeconomics', 'Microeconomics', 'Psychology', 'Human Geography', 'Art History',
    '2-D Art and Design', 'Music Theory', 'Spanish Language', 'French Language',
    'Chinese Language', 'Latin', 'Seminar', 'Research', 'African American Studies'
  ];

  // cost = yearly cost to run the department. pop = how often applicants pick it.
  // ap = AP courses students headed for this major tend to take.
  // courses = the department's course catalog, numbered 101, 201, 301, 401.
  const MAJORS = [
    { id: 'bio', name: 'Biology', dept: 'BIO', cost: 420000, pop: 9, ap: ['Biology', 'Chemistry', 'Environmental Science', 'Statistics'], courses: ['Principles of Biology', 'Genetics', 'Cell Biology', 'Ecology & Evolution'] },
    { id: 'chem', name: 'Chemistry', dept: 'CHEM', cost: 380000, pop: 3, ap: ['Chemistry', 'Calculus AB', 'Physics 1'], courses: ['General Chemistry', 'Organic Chemistry', 'Physical Chemistry', 'Biochemistry'] },
    { id: 'phys', name: 'Physics', dept: 'PHYS', cost: 360000, pop: 2, ap: ['Physics C: Mechanics', 'Calculus BC', 'Physics 1', 'Physics 2'], courses: ['Classical Mechanics', 'Electricity & Magnetism', 'Quantum Physics', 'Astrophysics'] },
    { id: 'math', name: 'Mathematics', dept: 'MATH', cost: 260000, pop: 3, ap: ['Calculus BC', 'Statistics', 'Calculus AB', 'Precalculus'], courses: ['Calculus I', 'Linear Algebra', 'Real Analysis', 'Abstract Algebra'] },
    { id: 'cs', name: 'Computer Science', dept: 'CS', cost: 450000, pop: 10, ap: ['Computer Science A', 'Computer Science Principles', 'Calculus BC', 'Statistics'], courses: ['Intro to Programming', 'Data Structures', 'Algorithms', 'Operating Systems'] },
    { id: 'data', name: 'Data Science', dept: 'DS', cost: 400000, pop: 4, ap: ['Statistics', 'Computer Science A', 'Calculus BC'], courses: ['Intro to Data Science', 'Data Visualization', 'Machine Learning', 'Databases'] },
    { id: 'engr', name: 'Engineering', dept: 'ENGR', cost: 650000, pop: 8, ap: ['Physics C: Mechanics', 'Calculus BC', 'Chemistry', 'Physics 1'], courses: ['Engineering Design', 'Statics', 'Thermodynamics', 'Circuit Analysis'] },
    { id: 'nurs', name: 'Nursing', dept: 'NURS', cost: 520000, pop: 7, ap: ['Biology', 'Chemistry', 'Psychology', 'Statistics'], courses: ['Foundations of Nursing', 'Anatomy & Physiology', 'Pharmacology', 'Clinical Practicum'] },
    { id: 'bus', name: 'Business Administration', dept: 'BUS', cost: 380000, pop: 10, ap: ['Microeconomics', 'Macroeconomics', 'Statistics', 'Calculus AB'], courses: ['Intro to Business', 'Financial Accounting', 'Marketing', 'Corporate Finance'] },
    { id: 'econ', name: 'Economics', dept: 'ECON', cost: 280000, pop: 5, ap: ['Microeconomics', 'Macroeconomics', 'Calculus AB', 'Statistics'], courses: ['Principles of Economics', 'Intermediate Microeconomics', 'Econometrics', 'Behavioral Economics'] },
    { id: 'psych', name: 'Psychology', dept: 'PSY', cost: 260000, pop: 8, ap: ['Psychology', 'Statistics', 'Biology'], courses: ['Intro to Psychology', 'Research Methods', 'Developmental Psychology', 'Cognitive Neuroscience'] },
    { id: 'poli', name: 'Political Science', dept: 'POLS', cost: 240000, pop: 5, ap: ['US Government', 'Comparative Government', 'US History'], courses: ['American Government', 'International Relations', 'Political Theory', 'Constitutional Law'] },
    { id: 'hist', name: 'History', dept: 'HIST', cost: 220000, pop: 3, ap: ['US History', 'World History', 'European History', 'African American Studies'], courses: ['US History to 1877', 'Modern Europe', 'World Civilizations', 'Historical Research Seminar'] },
    { id: 'engl', name: 'English', dept: 'ENG', cost: 220000, pop: 3, ap: ['English Literature', 'English Language', 'Seminar'], courses: ['Literary Analysis', 'Shakespeare', 'American Literature', 'Creative Writing Workshop'] },
    { id: 'comm', name: 'Communications', dept: 'COMM', cost: 240000, pop: 5, ap: ['English Language', 'Psychology', 'Seminar'], courses: ['Public Speaking', 'Media & Society', 'Journalism', 'Digital Media Production'] },
    { id: 'art', name: 'Studio Art', dept: 'ART', cost: 260000, pop: 2, ap: ['2-D Art and Design', 'Art History'], courses: ['Drawing I', 'Painting', 'Sculpture', 'Senior Thesis Studio'] },
    { id: 'mus', name: 'Music', dept: 'MUS', cost: 300000, pop: 2, ap: ['Music Theory'], courses: ['Music Theory I', 'Ensemble Performance', 'Music History', 'Composition'] },
    { id: 'film', name: 'Film Studies', dept: 'FILM', cost: 320000, pop: 2, ap: ['English Literature', 'Art History', '2-D Art and Design'], courses: ['Intro to Film', 'Screenwriting', 'Cinematography', 'Documentary Production'] },
    { id: 'edu', name: 'Education', dept: 'EDU', cost: 230000, pop: 4, ap: ['Psychology', 'English Language', 'Seminar'], courses: ['Foundations of Education', 'Child Development', 'Classroom Management', 'Student Teaching'] },
    { id: 'crim', name: 'Criminal Justice', dept: 'CRJ', cost: 220000, pop: 4, ap: ['US Government', 'Psychology'], courses: ['Intro to Criminal Justice', 'Criminology', 'Policing & Society', 'Forensic Science'] },
    { id: 'envs', name: 'Environmental Science', dept: 'ENVS', cost: 300000, pop: 3, ap: ['Environmental Science', 'Biology', 'Chemistry', 'Human Geography'], courses: ['Intro to Environmental Science', 'Climate Systems', 'Conservation Biology', 'GIS & Mapping'] },
    { id: 'kin', name: 'Kinesiology', dept: 'KIN', cost: 280000, pop: 4, ap: ['Biology', 'Psychology'], courses: ['Human Movement', 'Exercise Physiology', 'Sports Nutrition', 'Biomechanics'] },
    { id: 'lang', name: 'Modern Languages', dept: 'LANG', cost: 200000, pop: 1, ap: ['Spanish Language', 'French Language', 'Chinese Language', 'Latin'], courses: ['Intermediate Spanish', 'French Conversation', 'Mandarin I', 'Translation Studies'] },
    { id: 'phil', name: 'Philosophy', dept: 'PHIL', cost: 180000, pop: 1, ap: ['Seminar', 'English Literature', 'Research'], courses: ['Intro to Philosophy', 'Ethics', 'Logic', 'Philosophy of Mind'] },
    { id: 'arch', name: 'Architecture', dept: 'ARCH', cost: 550000, pop: 2, ap: ['Physics 1', 'Calculus AB', '2-D Art and Design'], courses: ['Design Studio I', 'Architectural History', 'Building Technology', 'Urban Design'] },
    { id: 'agri', name: 'Agriculture', dept: 'AGRI', cost: 340000, pop: 2, ap: ['Biology', 'Environmental Science', 'Chemistry'], courses: ['Soil Science', 'Animal Science', 'Crop Production', 'Agribusiness'] }
  ];

  // General education courses every school can offer, whatever its majors.
  const GEN_ED = {
    id: 'gen', name: 'General Education', dept: 'GEN',
    courses: ['English Composition', 'College Algebra', 'First-Year Seminar', 'Intro to Statistics', 'World Cultures', 'Health & Wellness', 'Ethics in Society', 'Information Literacy']
  };

  // roster = full team size. games = games (or meets) per season.
  // cost = yearly program cost. revenue = ticket and media money for a .500 season.
  const SPORTS = [
    { id: 'football', name: 'Football', roster: 85, games: 12, cost: 2600000, revenue: 2200000 },
    { id: 'basketball', name: 'Basketball', roster: 15, games: 30, cost: 950000, revenue: 1100000 },
    { id: 'baseball', name: 'Baseball', roster: 35, games: 50, cost: 600000, revenue: 250000 },
    { id: 'softball', name: 'Softball', roster: 25, games: 50, cost: 420000, revenue: 90000 },
    { id: 'soccer', name: 'Soccer', roster: 28, games: 18, cost: 450000, revenue: 120000 },
    { id: 'volleyball', name: 'Volleyball', roster: 18, games: 28, cost: 380000, revenue: 110000 },
    { id: 'hockey', name: 'Ice Hockey', roster: 28, games: 34, cost: 1200000, revenue: 700000 },
    { id: 'lacrosse', name: 'Lacrosse', roster: 40, games: 16, cost: 520000, revenue: 80000 },
    { id: 'swim', name: 'Swimming & Diving', roster: 30, games: 12, cost: 480000, revenue: 30000 },
    { id: 'track', name: 'Track & Field', roster: 50, games: 10, cost: 420000, revenue: 30000 },
    { id: 'xc', name: 'Cross Country', roster: 14, games: 8, cost: 160000, revenue: 10000 },
    { id: 'tennis', name: 'Tennis', roster: 10, games: 22, cost: 220000, revenue: 20000 },
    { id: 'golf', name: 'Golf', roster: 10, games: 10, cost: 260000, revenue: 30000 },
    { id: 'wrestling', name: 'Wrestling', roster: 30, games: 16, cost: 340000, revenue: 60000 },
    { id: 'rowing', name: 'Rowing', roster: 40, games: 8, cost: 520000, revenue: 20000 },
    { id: 'gymnastics', name: 'Gymnastics', roster: 16, games: 12, cost: 400000, revenue: 90000 },
    { id: 'fieldhockey', name: 'Field Hockey', roster: 24, games: 18, cost: 330000, revenue: 20000 },
    { id: 'waterpolo', name: 'Water Polo', roster: 24, games: 24, cost: 300000, revenue: 15000 },
    { id: 'esports', name: 'Esports', roster: 12, games: 20, cost: 180000, revenue: 40000 }
  ];

  // Section sizes for a class. Small classes cost more per seat but raise prestige.
  const CLASS_SIZES = {
    seminar: { label: 'Seminar', seats: 25, cost: 45000, quality: 1 },
    standard: { label: 'Standard', seats: 60, cost: 90000, quality: 0.6 },
    lecture: { label: 'Lecture hall', seats: 200, cost: 170000, quality: 0.2 }
  };

  const ACTIVITIES = [
    'Varsity team captain', 'Debate club president', 'Eagle Scout', 'Robotics team', 'Student council',
    'Marching band', 'School newspaper editor', 'Model UN', 'Hospital volunteer', 'Part-time job',
    'Science Olympiad', 'Theater lead', 'Food bank volunteer', 'Math team', 'Started a small business',
    'Church youth group leader', 'Orchestra first chair', 'Coding club founder', 'Mock trial',
    'Yearbook editor', 'Peer tutor', 'Habitat for Humanity', 'Summer research program', 'Cares for siblings',
    'Environmental club', 'Art portfolio', 'National Honor Society', 'Key Club', 'Dance company', 'FFA chapter officer'
  ];

  const MASCOTS = ['Owls', 'Hawks', 'Bears', 'Wolves', 'Stags', 'Comets', 'Mariners', 'Foxes', 'Herons', 'Rams', 'Pioneers', 'Lynx', 'Bison', 'Ospreys', 'Badgers'];
  const NAME_PARTS = {
    first: ['North', 'West', 'East', 'South', 'Lake', 'Mount', 'Cedar', 'Pine', 'River', 'Harbor', 'Stone', 'Maple', 'Oak', 'Silver', 'Fair'],
    second: ['brook', 'field', 'haven', 'ridge', 'wood', 'crest', 'dale', 'view', 'gate', 'ford', 'mont', 'hurst'],
    kind: ['University', 'College', 'State University', 'Institute of Technology']
  };

  const COLOR_PRESETS = [
    { name: 'Navy & Gold', primary: '#1f3a6b', secondary: '#e0a526' },
    { name: 'Crimson & Cream', primary: '#9e1b32', secondary: '#f2e8d5' },
    { name: 'Forest & Wheat', primary: '#1e5e3b', secondary: '#d9c27a' },
    { name: 'Purple & Old Gold', primary: '#4b2e83', secondary: '#b7a57a' },
    { name: 'Orange & Navy', primary: '#e5751f', secondary: '#13294b' },
    { name: 'Maroon & Silver', primary: '#6d1f2f', secondary: '#a5a7aa' },
    { name: 'Royal & White', primary: '#1d4fc4', secondary: '#ffffff' },
    { name: 'Black & Gold', primary: '#16161a', secondary: '#c9a227' }
  ];

  window.CB_DATA = {
    STATES, INTERNATIONAL, FIRST_NAMES, LAST_NAMES, AP_COURSES, MAJORS, GEN_ED, SPORTS,
    CLASS_SIZES, ACTIVITIES, MASCOTS, NAME_PARTS, COLOR_PRESETS
  };
})();

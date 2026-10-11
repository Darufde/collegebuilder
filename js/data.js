/* College Builder — static catalogs: places, names, majors, sports, classes, housing and Greek life. */
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

  // First names by gender. NEUTRAL names can go to anyone.
  const FEMALE_NAMES = [
    'Aaliyah', 'Abigail', 'Amara', 'Amelia', 'Ava', 'Brianna', 'Camila', 'Chloe', 'Elena', 'Emily',
    'Fatima', 'Grace', 'Hannah', 'Isabella', 'Jada', 'Jasmine', 'Keisha', 'Leah', 'Maya', 'Mei',
    'Mia', 'Naomi', 'Nia', 'Olivia', 'Priya', 'Ruby', 'Sara', 'Sofia', 'Valentina', 'Yara',
    'Zoe', 'Harper', 'Layla', 'Nora', 'Imani', 'Ananya', 'Aisha', 'Lucia', 'Madison', 'Gianna',
    'Hailey', 'Ximena', 'Ingrid', 'Kiara', 'Lily', 'Mariana', 'Noor', 'Penelope', 'Rosa', 'Sienna',
    'Tatiana', 'Victoria', 'Willow', 'Yuki', 'Zara', 'Anika', 'Beatriz', 'Clara', 'Destiny', 'Esperanza'
  ];
  const MALE_NAMES = [
    'Aarav', 'Aiden', 'Alejandro', 'Andre', 'Benjamin', 'Caleb', 'Carter', 'Daniel', 'Darius', 'Diego',
    'Eli', 'Ethan', 'Gabriel', 'Hiro', 'Isaiah', 'Jacob', 'Jamal', 'Javier', 'Julian', 'Liam',
    'Lucas', 'Luis', 'Mason', 'Mohammed', 'Nathan', 'Noah', 'Omar', 'Owen', 'Rafael', 'Rohan',
    'Samuel', 'Sebastian', 'Theo', 'Wei', 'Xavier', 'Yusuf', 'Zion', 'Elijah', 'Mateo', 'Ezra',
    'Arjun', 'Brandon', 'Cameron', 'Dmitri', 'Emeka', 'Felix', 'Hassan', 'Ivan', 'Jaylen', 'Kenji',
    'Malik', 'Marcus', 'Nikolai', 'Oscar', 'Pedro', 'Ravi', 'Santiago', 'Tyler', 'Victor', 'Wyatt'
  ];
  const NEUTRAL_NAMES = ['Jordan', 'Taylor', 'Quinn', 'Riley', 'Kai', 'Avery', 'Rowan', 'Morgan', 'Sage', 'Emerson'];
  const FIRST_NAMES = FEMALE_NAMES.concat(MALE_NAMES, NEUTRAL_NAMES);

  const LAST_NAMES = [
    'Adams', 'Ahmed', 'Alvarez', 'Anderson', 'Baker', 'Bennett', 'Brooks', 'Brown', 'Campbell', 'Carter',
    'Chen', 'Clark', 'Cohen', 'Collins', 'Cruz', 'Davis', 'Diaz', 'Edwards', 'Evans', 'Fischer',
    'Flores', 'Foster', 'Garcia', 'Gonzalez', 'Gupta', 'Hall', 'Harris', 'Hernandez', 'Hughes', 'Ibrahim',
    'Jackson', 'Johnson', 'Jones', 'Kaur', 'Kim', 'Kowalski', 'Lee', 'Lewis', 'Lopez', 'Martin',
    'Martinez', 'Mitchell', 'Moore', 'Morales', 'Murphy', 'Nguyen', 'Okafor', 'Olsen', 'Ortiz', 'Park',
    'Patel', 'Perez', 'Phillips', 'Ramirez', 'Reed', 'Rivera', 'Roberts', 'Robinson', 'Rossi', 'Sanchez',
    'Santos', 'Schmidt', 'Shah', 'Singh', 'Smith', 'Sullivan', 'Tanaka', 'Taylor', 'Thomas', 'Thompson',
    'Torres', 'Tran', 'Turner', 'Walker', 'Washington', 'Watson', 'White', 'Williams', 'Wright', 'Young',
    'Abara', 'Bianchi', 'Castillo', 'Dubois', 'Eriksen', 'Fernandes', 'Goldberg', 'Hoang', 'Ivanova', 'Jensen',
    'Khan', 'Larsen', 'Mensah', 'Nakamura', 'O\'Brien', 'Popescu', 'Qureshi', 'Reyes', 'Sato', 'Vasquez'
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

  // Groupings for the majors catalog.
  const AREAS = [
    { id: 'sci', name: 'Sciences & Math' },
    { id: 'tech', name: 'Engineering & Computing' },
    { id: 'health', name: 'Health' },
    { id: 'bus', name: 'Business' },
    { id: 'soc', name: 'Social Sciences' },
    { id: 'hum', name: 'Humanities' },
    { id: 'arts', name: 'Arts & Design' },
    { id: 'pro', name: 'Professional' }
  ];

  // cost = yearly cost to run the department. pop = how often applicants pick it.
  // f = share of applicants to this major who are women, so the majors you offer shape your gender balance.
  // ap = AP courses students headed for this major tend to take.
  // courses = the department's catalog. The first four are numbered 101, 201, 301, 401; the last two 250 and 350.
  const M = (id, name, dept, area, cost, pop, f, ap, courses) => ({ id, name, dept, area, cost, pop, f, ap, courses });
  const MAJORS = [
    // Sciences & Math
    M('bio', 'Biology', 'BIO', 'sci', 420000, 9, 0.62, ['Biology', 'Chemistry', 'Environmental Science', 'Statistics'], ['Principles of Biology', 'Genetics', 'Cell Biology', 'Ecology & Evolution', 'Microbiology', 'Molecular Biology Lab']),
    M('chem', 'Chemistry', 'CHEM', 'sci', 380000, 3, 0.5, ['Chemistry', 'Calculus AB', 'Physics 1'], ['General Chemistry', 'Organic Chemistry', 'Physical Chemistry', 'Biochemistry', 'Analytical Chemistry', 'Inorganic Chemistry']),
    M('phys', 'Physics', 'PHYS', 'sci', 360000, 2, 0.25, ['Physics C: Mechanics', 'Calculus BC', 'Physics 1', 'Physics 2'], ['Classical Mechanics', 'Electricity & Magnetism', 'Quantum Physics', 'Astrophysics', 'Modern Physics', 'Statistical Mechanics']),
    M('math', 'Mathematics', 'MATH', 'sci', 260000, 3, 0.42, ['Calculus BC', 'Statistics', 'Calculus AB', 'Precalculus'], ['Calculus I', 'Linear Algebra', 'Real Analysis', 'Abstract Algebra', 'Differential Equations', 'Number Theory']),
    M('stat', 'Statistics', 'STAT', 'sci', 250000, 2, 0.45, ['Statistics', 'Calculus AB', 'Computer Science A'], ['Intro to Statistics', 'Probability', 'Regression Analysis', 'Bayesian Statistics', 'Statistical Computing', 'Experimental Design']),
    M('envs', 'Environmental Science', 'ENVS', 'sci', 300000, 3, 0.58, ['Environmental Science', 'Biology', 'Chemistry', 'Human Geography'], ['Intro to Environmental Science', 'Climate Systems', 'Conservation Biology', 'GIS & Mapping', 'Water Resources', 'Environmental Policy']),
    M('neuro', 'Neuroscience', 'NEUR', 'sci', 440000, 4, 0.66, ['Biology', 'Psychology', 'Chemistry', 'Statistics'], ['Intro to Neuroscience', 'Neuroanatomy', 'Cellular Neuroscience', 'Neuroscience Research Seminar', 'Behavioral Neuroscience', 'Neuropharmacology']),
    M('bchm', 'Biochemistry', 'BCHM', 'sci', 430000, 3, 0.56, ['Chemistry', 'Biology', 'Calculus AB'], ['Foundations of Biochemistry', 'Protein Structure', 'Metabolism', 'Biochemistry Capstone', 'Enzymology', 'Structural Biology']),
    M('mbio', 'Marine Biology', 'MBIO', 'sci', 400000, 2, 0.68, ['Biology', 'Environmental Science', 'Chemistry'], ['Intro to Marine Science', 'Oceanography', 'Marine Ecology', 'Field Research at Sea', 'Marine Invertebrates', 'Coral Reef Biology']),
    M('geol', 'Geology', 'GEOL', 'sci', 320000, 1, 0.45, ['Environmental Science', 'Chemistry', 'Physics 1'], ['Physical Geology', 'Mineralogy', 'Structural Geology', 'Field Camp', 'Sedimentology', 'Geophysics']),
    M('astr', 'Astronomy', 'ASTR', 'sci', 380000, 1, 0.32, ['Physics 1', 'Calculus BC', 'Physics C: Mechanics'], ['The Solar System', 'Stellar Astrophysics', 'Galaxies & Cosmology', 'Observational Astronomy', 'Planetary Science', 'Radio Astronomy']),

    // Engineering & Computing
    M('cs', 'Computer Science', 'CS', 'tech', 450000, 10, 0.22, ['Computer Science A', 'Computer Science Principles', 'Calculus BC', 'Statistics'], ['Intro to Programming', 'Data Structures', 'Algorithms', 'Operating Systems', 'Computer Architecture', 'Software Engineering']),
    M('data', 'Data Science', 'DS', 'tech', 400000, 4, 0.35, ['Statistics', 'Computer Science A', 'Calculus BC'], ['Intro to Data Science', 'Data Visualization', 'Machine Learning', 'Databases', 'Data Ethics', 'Big Data Systems']),
    M('engr', 'General Engineering', 'ENGR', 'tech', 650000, 5, 0.23, ['Physics C: Mechanics', 'Calculus BC', 'Chemistry', 'Physics 1'], ['Engineering Design', 'Statics', 'Thermodynamics', 'Circuit Analysis', 'Materials Science', 'Engineering Project Management']),
    M('mech', 'Mechanical Engineering', 'ME', 'tech', 620000, 5, 0.16, ['Physics C: Mechanics', 'Calculus BC', 'Physics 1'], ['Intro to Mechanical Engineering', 'Dynamics', 'Fluid Mechanics', 'Senior Design: ME', 'Heat Transfer', 'Machine Design']),
    M('elec', 'Electrical Engineering', 'EE', 'tech', 620000, 4, 0.15, ['Physics 2', 'Calculus BC', 'Physics C: Mechanics', 'Computer Science A'], ['Intro to Electrical Engineering', 'Signals & Systems', 'Electronics', 'Senior Design: EE', 'Digital Logic', 'Power Systems']),
    M('civil', 'Civil Engineering', 'CE', 'tech', 580000, 3, 0.27, ['Physics 1', 'Calculus AB', 'Environmental Science'], ['Intro to Civil Engineering', 'Structural Analysis', 'Geotechnical Engineering', 'Senior Design: CE', 'Transportation Engineering', 'Water Resources Engineering']),
    M('bme', 'Biomedical Engineering', 'BME', 'tech', 640000, 4, 0.45, ['Biology', 'Calculus BC', 'Chemistry', 'Physics 1'], ['Intro to Biomedical Engineering', 'Biomechanics', 'Biomaterials', 'Senior Design: BME', 'Medical Imaging', 'Tissue Engineering']),
    M('cheme', 'Chemical Engineering', 'CHE', 'tech', 610000, 2, 0.35, ['Chemistry', 'Calculus BC', 'Physics C: Mechanics'], ['Intro to Chemical Engineering', 'Mass & Energy Balances', 'Transport Phenomena', 'Plant Design', 'Reaction Engineering', 'Process Control']),
    M('aero', 'Aerospace Engineering', 'AERO', 'tech', 700000, 3, 0.15, ['Physics C: Mechanics', 'Calculus BC', 'Physics 2'], ['Intro to Aerospace', 'Aerodynamics', 'Propulsion', 'Spacecraft Design', 'Flight Mechanics', 'Orbital Mechanics']),
    M('cyber', 'Cybersecurity', 'CYB', 'tech', 420000, 3, 0.2, ['Computer Science A', 'Computer Science Principles', 'Statistics'], ['Intro to Cybersecurity', 'Network Security', 'Cryptography', 'Ethical Hacking Capstone', 'Digital Forensics', 'Secure Software']),
    M('infosys', 'Information Systems', 'IS', 'tech', 330000, 3, 0.32, ['Computer Science Principles', 'Statistics', 'Microeconomics'], ['Intro to Information Systems', 'Systems Analysis', 'Enterprise Systems', 'IT Strategy', 'Web Development', 'Cloud Computing']),

    // Health
    M('nurs', 'Nursing', 'NURS', 'health', 520000, 7, 0.87, ['Biology', 'Chemistry', 'Psychology', 'Statistics'], ['Foundations of Nursing', 'Anatomy & Physiology', 'Pharmacology', 'Clinical Practicum', 'Pediatric Nursing', 'Community Health Nursing']),
    M('kin', 'Kinesiology', 'KIN', 'health', 280000, 4, 0.55, ['Biology', 'Psychology'], ['Human Movement', 'Exercise Physiology', 'Sports Nutrition', 'Biomechanics', 'Motor Learning', 'Strength & Conditioning']),
    M('pubh', 'Public Health', 'PH', 'health', 300000, 4, 0.8, ['Biology', 'Statistics', 'Psychology'], ['Intro to Public Health', 'Epidemiology', 'Global Health', 'Health Policy', 'Biostatistics', 'Community Health']),
    M('pharm', 'Pharmacy', 'PHAR', 'health', 560000, 2, 0.64, ['Chemistry', 'Biology', 'Calculus AB'], ['Intro to Pharmacy', 'Medicinal Chemistry', 'Pharmacokinetics', 'Pharmacy Practice', 'Pharmacotherapy', 'Drug Development']),
    M('nutr', 'Nutrition & Dietetics', 'NUTR', 'health', 260000, 2, 0.86, ['Biology', 'Chemistry', 'Psychology'], ['Intro to Nutrition', 'Food Science', 'Clinical Nutrition', 'Dietetics Internship', 'Nutrition Through the Lifespan', 'Community Nutrition']),
    M('hsci', 'Health Sciences', 'HSCI', 'health', 320000, 5, 0.76, ['Biology', 'Psychology', 'Statistics'], ['Intro to Health Professions', 'Medical Terminology', 'Pathophysiology', 'Health Sciences Capstone', 'Healthcare Ethics', 'Physical Therapy Foundations']),

    // Business
    M('bus', 'Business Administration', 'BUS', 'bus', 380000, 10, 0.47, ['Microeconomics', 'Macroeconomics', 'Statistics', 'Calculus AB'], ['Intro to Business', 'Financial Accounting', 'Marketing', 'Corporate Finance', 'Organizational Behavior', 'Business Strategy']),
    M('fin', 'Finance', 'FIN', 'bus', 360000, 5, 0.32, ['Calculus AB', 'Statistics', 'Macroeconomics', 'Microeconomics'], ['Personal Finance', 'Investments', 'Financial Modeling', 'Portfolio Management', 'Financial Markets', 'Derivatives']),
    M('acct', 'Accounting', 'ACCT', 'bus', 320000, 4, 0.52, ['Statistics', 'Microeconomics', 'Calculus AB'], ['Principles of Accounting', 'Intermediate Accounting', 'Auditing', 'Taxation', 'Cost Accounting', 'Forensic Accounting']),
    M('mktg', 'Marketing', 'MKT', 'bus', 300000, 4, 0.6, ['Psychology', 'Statistics', 'Microeconomics'], ['Principles of Marketing', 'Consumer Behavior', 'Digital Marketing', 'Brand Strategy', 'Marketing Research', 'Social Media Marketing']),
    M('entr', 'Entrepreneurship', 'ENT', 'bus', 300000, 2, 0.38, ['Microeconomics', 'Computer Science Principles', 'Statistics'], ['Intro to Entrepreneurship', 'Venture Finance', 'Product Design', 'Startup Launch Lab', 'Innovation Management', 'Social Entrepreneurship']),
    M('hosp', 'Hospitality Management', 'HOSP', 'bus', 290000, 2, 0.64, ['Microeconomics', 'Psychology'], ['Intro to Hospitality', 'Hotel Operations', 'Event Management', 'Resort Management', 'Food & Beverage Management', 'Tourism Marketing']),
    M('scm', 'Supply Chain Management', 'SCM', 'bus', 320000, 2, 0.36, ['Statistics', 'Microeconomics', 'Calculus AB'], ['Intro to Supply Chains', 'Operations Management', 'Logistics', 'Global Sourcing', 'Inventory Analytics', 'Procurement']),
    M('sptm', 'Sport Management', 'SPMG', 'bus', 270000, 3, 0.3, ['Microeconomics', 'Psychology'], ['Intro to Sport Management', 'Sport Marketing', 'Facility Management', 'Sport Law', 'Sport Finance', 'Athletic Administration']),

    // Social Sciences
    M('econ', 'Economics', 'ECON', 'soc', 280000, 5, 0.33, ['Microeconomics', 'Macroeconomics', 'Calculus AB', 'Statistics'], ['Principles of Economics', 'Intermediate Microeconomics', 'Econometrics', 'Behavioral Economics', 'Intermediate Macroeconomics', 'Development Economics']),
    M('psych', 'Psychology', 'PSY', 'soc', 260000, 8, 0.78, ['Psychology', 'Statistics', 'Biology'], ['Intro to Psychology', 'Research Methods', 'Developmental Psychology', 'Cognitive Neuroscience', 'Social Psychology', 'Abnormal Psychology']),
    M('poli', 'Political Science', 'POLS', 'soc', 240000, 5, 0.48, ['US Government', 'Comparative Government', 'US History'], ['American Government', 'International Relations', 'Political Theory', 'Constitutional Law', 'Comparative Politics', 'Campaigns & Elections']),
    M('crim', 'Criminal Justice', 'CRJ', 'soc', 220000, 4, 0.52, ['US Government', 'Psychology'], ['Intro to Criminal Justice', 'Criminology', 'Policing & Society', 'Forensic Science', 'Corrections', 'Juvenile Justice']),
    M('soc', 'Sociology', 'SOC', 'soc', 210000, 3, 0.7, ['Psychology', 'Statistics', 'Human Geography'], ['Intro to Sociology', 'Social Inequality', 'Sociological Theory', 'Sociology Research Seminar', 'Race & Ethnicity', 'Urban Sociology']),
    M('anth', 'Anthropology', 'ANTH', 'soc', 220000, 2, 0.7, ['Human Geography', 'World History', 'Biology'], ['Intro to Anthropology', 'Cultural Anthropology', 'Archaeology', 'Ethnographic Fieldwork', 'Biological Anthropology', 'Medical Anthropology']),
    M('intl', 'International Relations', 'IR', 'soc', 250000, 3, 0.58, ['Comparative Government', 'World History', 'Macroeconomics'], ['Intro to Global Affairs', 'Diplomacy', 'International Security', 'Global Governance', 'International Political Economy', 'Human Rights']),
    M('geog', 'Geography', 'GEOG', 'soc', 210000, 1, 0.45, ['Human Geography', 'Environmental Science'], ['World Regional Geography', 'Cartography', 'Urban Geography', 'Geography Capstone', 'Remote Sensing', 'Economic Geography']),
    M('ling', 'Linguistics', 'LING', 'soc', 220000, 1, 0.68, ['English Language', 'Spanish Language', 'Psychology'], ['Intro to Linguistics', 'Phonetics', 'Syntax', 'Linguistics Thesis', 'Sociolinguistics', 'Language Acquisition']),
    M('cogs', 'Cognitive Science', 'COGS', 'soc', 300000, 2, 0.52, ['Psychology', 'Computer Science A', 'Statistics'], ['Intro to Cognitive Science', 'Minds & Machines', 'Computational Cognition', 'Cognitive Science Capstone', 'Perception', 'Language & Thought']),
    M('gws', 'Gender & Sexuality Studies', 'GSS', 'soc', 180000, 1, 0.86, ['English Literature', 'US History', 'Psychology'], ['Intro to Gender Studies', 'Feminist Theory', 'Queer Theory', 'Gender Studies Seminar', 'Gender & Media', 'Gender & Health']),

    // Humanities
    M('hist', 'History', 'HIST', 'hum', 220000, 3, 0.42, ['US History', 'World History', 'European History', 'African American Studies'], ['US History to 1877', 'Modern Europe', 'World Civilizations', 'Historical Research Seminar', 'US History Since 1877', 'History of Latin America']),
    M('engl', 'English', 'ENG', 'hum', 220000, 3, 0.7, ['English Literature', 'English Language', 'Seminar'], ['Literary Analysis', 'Shakespeare', 'American Literature', 'Creative Writing Workshop', 'British Literature', 'Literary Theory']),
    M('lang', 'Modern Languages', 'LANG', 'hum', 200000, 1, 0.7, ['Spanish Language', 'French Language', 'Chinese Language', 'Latin'], ['Intermediate Spanish', 'French Conversation', 'Mandarin I', 'Translation Studies', 'Arabic I', 'Japanese I']),
    M('phil', 'Philosophy', 'PHIL', 'hum', 180000, 1, 0.4, ['Seminar', 'English Literature', 'Research'], ['Intro to Philosophy', 'Ethics', 'Logic', 'Philosophy of Mind', 'Political Philosophy', 'Existentialism']),
    M('rel', 'Religious Studies', 'REL', 'hum', 170000, 1, 0.55, ['World History', 'Human Geography', 'Seminar'], ['World Religions', 'Religion in America', 'Sacred Texts', 'Religion Senior Seminar', 'Religion & Science', 'Islam & the Modern World']),
    M('clas', 'Classics', 'CLAS', 'hum', 170000, 1, 0.5, ['Latin', 'European History', 'English Literature'], ['Intro to Classics', 'Greek Mythology', 'Roman History', 'Classics Thesis', 'Ancient Greek I', 'Classical Archaeology']),
    M('afam', 'African American Studies', 'AAS', 'hum', 190000, 1, 0.66, ['African American Studies', 'US History', 'English Literature'], ['Intro to African American Studies', 'Black Literature', 'Civil Rights Movement', 'AAS Senior Seminar', 'The African Diaspora', 'Black Music & Culture']),
    M('cwri', 'Creative Writing', 'CW', 'hum', 200000, 2, 0.68, ['English Literature', 'English Language'], ['Intro to Creative Writing', 'Fiction Workshop', 'Poetry Workshop', 'Thesis Manuscript', 'Screenwriting for Writers', 'Nonfiction Workshop']),

    // Arts & Design
    M('art', 'Studio Art', 'ART', 'arts', 260000, 2, 0.72, ['2-D Art and Design', 'Art History'], ['Drawing I', 'Painting', 'Sculpture', 'Senior Thesis Studio', 'Printmaking', 'Ceramics']),
    M('mus', 'Music', 'MUS', 'arts', 300000, 2, 0.45, ['Music Theory'], ['Music Theory I', 'Ensemble Performance', 'Music History', 'Composition', 'Conducting', 'Jazz Studies']),
    M('film', 'Film Studies', 'FILM', 'arts', 320000, 2, 0.45, ['English Literature', 'Art History', '2-D Art and Design'], ['Intro to Film', 'Screenwriting', 'Cinematography', 'Documentary Production', 'Film Editing', 'World Cinema']),
    M('thea', 'Theater', 'THEA', 'arts', 280000, 2, 0.65, ['English Literature', 'Music Theory'], ['Acting I', 'Stagecraft', 'Directing', 'Senior Production', 'Theater History', 'Musical Theater']),
    M('danc', 'Dance', 'DANC', 'arts', 260000, 1, 0.88, ['Music Theory', 'Art History'], ['Dance Technique', 'Choreography', 'Dance History', 'Senior Dance Concert', 'Modern Dance', 'Dance Kinesiology']),
    M('gdes', 'Graphic Design', 'GDES', 'arts', 290000, 3, 0.64, ['2-D Art and Design', 'Computer Science Principles'], ['Design Fundamentals', 'Typography', 'Interaction Design', 'Design Portfolio', 'Branding & Identity', 'Motion Graphics']),
    M('fash', 'Fashion Design', 'FASH', 'arts', 340000, 2, 0.86, ['2-D Art and Design', 'Art History'], ['Fashion Illustration', 'Pattern Making', 'Textile Science', 'Senior Collection', 'Fashion History', 'Fashion Merchandising']),
    M('game', 'Game Design', 'GAME', 'arts', 380000, 3, 0.22, ['Computer Science A', '2-D Art and Design', 'Computer Science Principles'], ['Intro to Game Design', 'Game Programming', '3D Modeling', 'Game Studio Capstone', 'Level Design', 'Game Narrative']),
    M('anim', 'Animation', 'ANIM', 'arts', 360000, 2, 0.56, ['2-D Art and Design', 'Computer Science Principles'], ['Animation Principles', 'Character Animation', '3D Animation', 'Animated Short Film', 'Storyboarding', 'Visual Effects']),
    M('photo', 'Photography', 'PHOT', 'arts', 240000, 1, 0.6, ['2-D Art and Design', 'Art History'], ['Photography I', 'Darkroom Techniques', 'Documentary Photography', 'Photo Thesis', 'Digital Imaging', 'Studio Lighting']),

    // Professional
    M('edu', 'Education', 'EDU', 'pro', 230000, 4, 0.8, ['Psychology', 'English Language', 'Seminar'], ['Foundations of Education', 'Child Development', 'Classroom Management', 'Student Teaching', 'Special Education', 'Literacy Instruction']),
    M('comm', 'Communications', 'COMM', 'pro', 240000, 5, 0.66, ['English Language', 'Psychology', 'Seminar'], ['Public Speaking', 'Media & Society', 'Journalism', 'Digital Media Production', 'Public Relations', 'Persuasion']),
    M('jour', 'Journalism', 'JOUR', 'pro', 240000, 2, 0.64, ['English Language', 'US Government'], ['News Writing', 'Reporting', 'Investigative Journalism', 'Capstone Newsroom', 'Broadcast Journalism', 'Data Journalism']),
    M('arch', 'Architecture', 'ARCH', 'pro', 550000, 2, 0.48, ['Physics 1', 'Calculus AB', '2-D Art and Design'], ['Design Studio I', 'Architectural History', 'Building Technology', 'Urban Design', 'Design Studio II', 'Sustainable Architecture']),
    M('agri', 'Agriculture', 'AGRI', 'pro', 340000, 2, 0.5, ['Biology', 'Environmental Science', 'Chemistry'], ['Soil Science', 'Animal Science', 'Crop Production', 'Agribusiness', 'Plant Pathology', 'Precision Agriculture']),
    M('ansc', 'Animal Science', 'ANSC', 'pro', 380000, 2, 0.78, ['Biology', 'Chemistry'], ['Intro to Animal Science', 'Animal Nutrition', 'Animal Physiology', 'Pre-Veterinary Capstone', 'Animal Behavior', 'Equine Science']),
    M('socw', 'Social Work', 'SW', 'pro', 230000, 3, 0.87, ['Psychology', 'US Government'], ['Intro to Social Work', 'Human Behavior', 'Social Welfare Policy', 'Field Practicum', 'Family Services', 'Mental Health Practice']),
    M('legal', 'Legal Studies', 'LEGL', 'pro', 230000, 3, 0.6, ['US Government', 'English Language', 'US History'], ['Intro to Law', 'Contracts', 'Criminal Law', 'Moot Court', 'Legal Writing', 'Civil Rights Law']),
    M('fors', 'Forensic Science', 'FSCI', 'pro', 360000, 2, 0.74, ['Chemistry', 'Biology'], ['Intro to Forensics', 'Crime Scene Investigation', 'Forensic Chemistry', 'Forensic Capstone', 'Forensic DNA', 'Toxicology']),
    M('avia', 'Aviation', 'AVIA', 'pro', 600000, 1, 0.12, ['Physics 1', 'Precalculus'], ['Private Pilot Ground School', 'Aviation Weather', 'Instrument Flight', 'Commercial Pilot Capstone', 'Aviation Safety', 'Air Traffic Control']),
    M('cmgt', 'Construction Management', 'CM', 'pro', 330000, 2, 0.14, ['Physics 1', 'Precalculus', 'Statistics'], ['Intro to Construction', 'Estimating', 'Project Scheduling', 'Construction Capstone', 'Building Codes', 'Construction Safety']),
    M('plan', 'Urban Planning', 'PLAN', 'pro', 260000, 1, 0.5, ['Human Geography', 'US Government', 'Statistics'], ['Intro to Urban Planning', 'Land Use', 'Transportation Planning', 'Planning Studio', 'Housing Policy', 'Planning Law'])
  ];

  // General education courses every school can offer, whatever its majors. Numbered GEN 101, 102, ...
  const GEN_ED = {
    id: 'gen', name: 'General Education', dept: 'GEN', area: 'gen',
    courses: ['English Composition', 'College Algebra', 'First-Year Seminar', 'Intro to Statistics', 'World Cultures', 'Health & Wellness', 'Ethics in Society', 'Information Literacy', 'Public Speaking Basics', 'Scientific Reasoning', 'Art Appreciation', 'Personal Finance Basics']
  };

  // roster = full team size. games = games (or meets) per season.
  // cost = yearly program cost. revenue = ticket and media money for a .500 season.
  // g = which students the program recruits: 'M' men's, 'F' women's, or null for men's and women's squads.
  const SPORTS = [
    { id: 'football', name: 'Football', g: 'M', roster: 85, games: 12, cost: 2600000, revenue: 2200000 },
    { id: 'basketball', name: 'Basketball', g: null, roster: 15, games: 30, cost: 950000, revenue: 1100000 },
    { id: 'baseball', name: 'Baseball', g: 'M', roster: 35, games: 50, cost: 600000, revenue: 250000 },
    { id: 'softball', name: 'Softball', g: 'F', roster: 25, games: 50, cost: 420000, revenue: 90000 },
    { id: 'soccer', name: 'Soccer', g: null, roster: 28, games: 18, cost: 450000, revenue: 120000 },
    { id: 'volleyball', name: 'Volleyball', g: null, roster: 18, games: 28, cost: 380000, revenue: 110000 },
    { id: 'hockey', name: 'Ice Hockey', g: null, roster: 28, games: 34, cost: 1200000, revenue: 700000 },
    { id: 'lacrosse', name: 'Lacrosse', g: null, roster: 40, games: 16, cost: 520000, revenue: 80000 },
    { id: 'swim', name: 'Swimming & Diving', g: null, roster: 30, games: 12, cost: 480000, revenue: 30000 },
    { id: 'track', name: 'Track & Field', g: null, roster: 50, games: 10, cost: 420000, revenue: 30000 },
    { id: 'xc', name: 'Cross Country', g: null, roster: 14, games: 8, cost: 160000, revenue: 10000 },
    { id: 'tennis', name: 'Tennis', g: null, roster: 10, games: 22, cost: 220000, revenue: 20000 },
    { id: 'golf', name: 'Golf', g: null, roster: 10, games: 10, cost: 260000, revenue: 30000 },
    { id: 'wrestling', name: 'Wrestling', g: 'M', roster: 30, games: 16, cost: 340000, revenue: 60000 },
    { id: 'rowing', name: 'Rowing', g: null, roster: 40, games: 8, cost: 520000, revenue: 20000 },
    { id: 'gymnastics', name: 'Gymnastics', g: 'F', roster: 16, games: 12, cost: 400000, revenue: 90000 },
    { id: 'fieldhockey', name: 'Field Hockey', g: 'F', roster: 24, games: 18, cost: 330000, revenue: 20000 },
    { id: 'waterpolo', name: 'Water Polo', g: null, roster: 24, games: 24, cost: 300000, revenue: 15000 },
    { id: 'esports', name: 'Esports', g: null, roster: 12, games: 20, cost: 180000, revenue: 40000 }
  ];

  // Section sizes for a class. Small classes cost more per seat but raise prestige.
  const CLASS_SIZES = {
    seminar: { label: 'Seminar', seats: 25, cost: 45000, quality: 1 },
    standard: { label: 'Standard', seats: 60, cost: 90000, quality: 0.6 },
    lecture: { label: 'Lecture hall', seats: 200, cost: 170000, quality: 0.2 }
  };

  // Campus-life dimensions students feed with their activities.
  const LIFE_TAGS = {
    leader: 'Leadership & student government',
    arts: 'Arts & performance',
    service: 'Service & volunteering',
    stem: 'Research & innovation',
    media: 'Media & publications',
    social: 'Clubs & social scene'
  };

  // [activity, campus-life tag]
  const ACTIVITIES = [
    ['Varsity team captain', 'leader'], ['Debate club president', 'leader'], ['Eagle Scout', 'leader'], ['Robotics team', 'stem'],
    ['Student council', 'leader'], ['Marching band', 'arts'], ['School newspaper editor', 'media'], ['Model UN', 'leader'],
    ['Hospital volunteer', 'service'], ['Part-time job', 'service'], ['Science Olympiad', 'stem'], ['Theater lead', 'arts'],
    ['Food bank volunteer', 'service'], ['Math team', 'stem'], ['Started a small business', 'leader'], ['Church youth group leader', 'service'],
    ['Orchestra first chair', 'arts'], ['Coding club founder', 'stem'], ['Mock trial', 'leader'], ['Yearbook editor', 'media'],
    ['Peer tutor', 'service'], ['Habitat for Humanity', 'service'], ['Summer research program', 'stem'], ['Cares for siblings', 'service'],
    ['Environmental club', 'service'], ['Art portfolio', 'arts'], ['National Honor Society', 'leader'], ['Key Club', 'service'],
    ['Dance company', 'arts'], ['FFA chapter officer', 'leader'], ['Homecoming committee', 'social'], ['Prom planning committee', 'social'],
    ['Cultural club president', 'social'], ['Improv comedy troupe', 'arts'], ['Podcast host', 'media'], ['YouTube channel', 'media'],
    ['School radio DJ', 'media'], ['Ski club', 'social'], ['Spirit squad', 'social'], ['Gaming club', 'social'],
    ['Cheerleading', 'social'], ['Photography club', 'arts'], ['Hackathon winner', 'stem'], ['Lifeguard', 'service'],
    ['Model rocketry', 'stem'], ['Choir section leader', 'arts'], ['Class president', 'leader'], ['Best Buddies chapter', 'social']
  ];

  // Rare standouts. Once enrolled they make news (good or bad) every year they're on campus.
  // min = lowest academic quality that can carry the hook. life = campus-life tag they boost.
  const HOOKS = {
    merit: { label: 'National Merit Scholar', min: 78, w: 4, life: 'stem', blurb: 'Top national test scorer. Strong chance of winning major fellowships.' },
    research: { label: 'National science fair finalist', min: 68, w: 3, life: 'stem', blurb: 'Already doing real research. Likely to publish while here.' },
    debate: { label: 'National debate champion', min: 55, w: 3, life: 'leader', blurb: 'Would anchor a winning debate team.' },
    founder: { label: 'Founded a nonprofit', min: 40, w: 3, life: 'service', blurb: 'Runs a charity that draws press and volunteers.' },
    startup: { label: 'Runs a profitable startup', min: 40, w: 3, life: 'leader', blurb: 'Entrepreneur. Could become a very generous alum.' },
    influencer: { label: 'Social media creator', min: 0, w: 4, life: 'media', blurb: 'Huge following. Posts can send applications soaring, or stir up controversy.' },
    performer: { label: 'Professional performer', min: 0, w: 2, life: 'arts', blurb: 'Has acted or recorded professionally. Brings attention to campus arts.' },
    artist: { label: 'Award-winning artist', min: 0, w: 2, life: 'arts', blurb: 'National art awards. Lifts the arts scene.' },
    activist: { label: 'Youth activist', min: 0, w: 2, life: 'service', blurb: 'Organizer with national press. Energizes campus, sometimes controversially.' },
    olympian: { label: 'Junior national team athlete', min: 0, w: 2, life: null, blurb: 'Elite athlete. Wins titles and headlines.' },
    donor: { label: 'Philanthropic family', min: 0, w: 2, life: null, blurb: 'Their family gives big gifts to schools their children attend.' },
    trouble: { label: 'Disciplinary record', min: 0, w: 4, life: null, blurb: 'Past suspensions. Risk of incidents that hurt your reputation.' }
  };

  // Family income brackets. efc = what the family can pay toward tuition, room and board each year.
  const INCOME = [
    { id: 0, label: 'Under $50K', w: 28, efc: [0, 4000] },
    { id: 1, label: '$50K–$100K', w: 32, efc: [5000, 18000] },
    { id: 2, label: '$100K–$200K', w: 27, efc: [18000, 45000] },
    { id: 3, label: 'Over $200K', w: 13, efc: [55000, 120000] }
  ];

  // Residence halls you can build. upkeep is per bed per year; appeal makes students happier to live on campus.
  const DORMS = {
    traditional: { label: 'Traditional hall', beds: 200, cost: 9000000, upkeep: 2200, appeal: 0, note: 'Double rooms down a shared hallway. Cheap beds.' },
    suites: { label: 'Suite-style hall', beds: 160, cost: 11500000, upkeep: 2600, appeal: 1, note: 'Small suites with shared bathrooms. Students like them.' },
    apartments: { label: 'Apartment complex', beds: 120, cost: 10500000, upkeep: 2800, appeal: 1.5, note: 'Kitchens and single bedrooms. Keeps upperclassmen on campus.' },
    honors: { label: 'Honors college hall', beds: 100, cost: 12000000, upkeep: 3200, appeal: 2, note: 'Seminar rooms and faculty in residence. Top students notice.' },
    tower: { label: 'High-rise tower', beds: 450, cost: 34000000, upkeep: 2700, appeal: 1.5, note: 'Lots of beds with a dining hall on the ground floor.' }
  };
  const HALL_NAMES = [
    'Founders', 'Heritage', 'Oak', 'Maple', 'Willow', 'Cedar', 'Lakeside', 'Hillcrest', 'Pioneer', 'Summit',
    'Riverside', 'Commons', 'Liberty', 'Meridian', 'Aspen', 'Juniper', 'Sycamore', 'Magnolia', 'Laurel', 'Birch',
    'Chestnut', 'Linden', 'Hawthorne', 'Beacon', 'Harbor', 'Prairie', 'Canyon', 'Granite', 'Evergreen', 'Northgate'
  ];

  // Greek-letter chapters you can charter.
  const FRATERNITIES = [
    'Alpha Tau Omega', 'Sigma Chi', 'Kappa Sigma', 'Phi Delta Theta', 'Beta Theta Pi', 'Sigma Nu', 'Pi Kappa Alpha',
    'Delta Tau Delta', 'Lambda Chi Alpha', 'Theta Chi', 'Sigma Phi Epsilon', 'Phi Gamma Delta', 'Alpha Phi Alpha', 'Kappa Alpha Psi'
  ];
  const SORORITIES = [
    'Alpha Phi', 'Chi Omega', 'Kappa Kappa Gamma', 'Delta Gamma', 'Alpha Chi Omega', 'Pi Beta Phi', 'Kappa Alpha Theta',
    'Zeta Tau Alpha', 'Alpha Delta Pi', 'Gamma Phi Beta', 'Delta Delta Delta', 'Phi Mu', 'Delta Sigma Theta', 'Alpha Kappa Alpha'
  ];
  const GREEK = {
    charterCost: 150000, upkeep: 60000, cap: 120, houseCost: 2500000, houseBeds: 45, houseUpkeep: 2400
  };
  const GREEK_POLICIES = {
    strict: { label: 'Strict', interest: 0.7, risk: 0.4, life: 0.8, note: 'Dry rush, live-in advisors. Fewer members, fewer incidents.' },
    standard: { label: 'Standard', interest: 1, risk: 1, life: 1, note: 'Typical oversight from a Greek life office.' },
    relaxed: { label: 'Hands-off', interest: 1.3, risk: 2.2, life: 1.2, note: 'Big parties and big rush classes. Incidents are far more likely.' }
  };

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
    STATES, INTERNATIONAL, FEMALE_NAMES, MALE_NAMES, NEUTRAL_NAMES, FIRST_NAMES, LAST_NAMES, AP_COURSES,
    AREAS, MAJORS, GEN_ED, SPORTS, CLASS_SIZES, LIFE_TAGS, ACTIVITIES, HOOKS, INCOME, DORMS, HALL_NAMES,
    FRATERNITIES, SORORITIES, GREEK, GREEK_POLICIES, MASCOTS, NAME_PARTS, COLOR_PRESETS
  };
})();

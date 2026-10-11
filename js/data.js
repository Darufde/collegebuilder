/* College Builder — static catalogs: places, names, majors, sports, classes, housing and Greek life. */
(function () {
  'use strict';

  // [code, name, population in millions (weights where applicants come from), cities]
  const STATES = [
    ['AL', 'Alabama', 5.0, ['Birmingham', 'Huntsville', 'Mobile', 'Montgomery', 'Tuscaloosa', 'Auburn']],
    ['AK', 'Alaska', 0.7, ['Anchorage', 'Fairbanks', 'Juneau', 'Wasilla']],
    ['AZ', 'Arizona', 7.2, ['Phoenix', 'Tucson', 'Flagstaff', 'Mesa', 'Scottsdale', 'Tempe', 'Chandler', 'Yuma']],
    ['AR', 'Arkansas', 3.0, ['Little Rock', 'Fayetteville', 'Fort Smith', 'Jonesboro', 'Bentonville', 'Conway']],
    ['CA', 'California', 39.0, ['Los Angeles', 'San Diego', 'Sacramento', 'Fresno', 'San Jose', 'Oakland', 'San Francisco', 'Long Beach', 'Bakersfield', 'Irvine', 'Riverside', 'Santa Barbara', 'Pasadena', 'Stockton']],
    ['CO', 'Colorado', 5.8, ['Denver', 'Boulder', 'Colorado Springs', 'Fort Collins', 'Aurora', 'Pueblo', 'Grand Junction']],
    ['CT', 'Connecticut', 3.6, ['Hartford', 'New Haven', 'Stamford', 'Bridgeport', 'Waterbury', 'Greenwich']],
    ['DE', 'Delaware', 1.0, ['Wilmington', 'Dover', 'Newark', 'Lewes']],
    ['DC', 'District of Columbia', 0.7, ['Washington']],
    ['FL', 'Florida', 22.0, ['Miami', 'Tampa', 'Orlando', 'Jacksonville', 'Tallahassee', 'Gainesville', 'Fort Lauderdale', 'St. Petersburg', 'Pensacola', 'Sarasota', 'Boca Raton']],
    ['GA', 'Georgia', 10.9, ['Atlanta', 'Savannah', 'Athens', 'Macon', 'Augusta', 'Columbus', 'Marietta', 'Valdosta']],
    ['HI', 'Hawaii', 1.4, ['Honolulu', 'Hilo', 'Kailua', 'Kahului']],
    ['ID', 'Idaho', 1.9, ['Boise', 'Idaho Falls', 'Pocatello', 'Coeur d’Alene', 'Nampa']],
    ['IL', 'Illinois', 12.6, ['Chicago', 'Springfield', 'Naperville', 'Peoria', 'Rockford', 'Champaign', 'Evanston', 'Aurora', 'Joliet']],
    ['IN', 'Indiana', 6.8, ['Indianapolis', 'Bloomington', 'Fort Wayne', 'South Bend', 'Evansville', 'Carmel', 'West Lafayette']],
    ['IA', 'Iowa', 3.2, ['Des Moines', 'Iowa City', 'Cedar Rapids', 'Davenport', 'Ames', 'Sioux City']],
    ['KS', 'Kansas', 2.9, ['Wichita', 'Lawrence', 'Topeka', 'Overland Park', 'Manhattan', 'Olathe']],
    ['KY', 'Kentucky', 4.5, ['Louisville', 'Lexington', 'Bowling Green', 'Owensboro', 'Covington', 'Frankfort']],
    ['LA', 'Louisiana', 4.6, ['New Orleans', 'Baton Rouge', 'Shreveport', 'Lafayette', 'Lake Charles', 'Monroe']],
    ['ME', 'Maine', 1.4, ['Portland', 'Bangor', 'Lewiston', 'Augusta', 'Bar Harbor']],
    ['MD', 'Maryland', 6.2, ['Baltimore', 'Annapolis', 'Bethesda', 'Silver Spring', 'Columbia', 'Frederick', 'Rockville']],
    ['MA', 'Massachusetts', 7.0, ['Boston', 'Worcester', 'Cambridge', 'Springfield', 'Lowell', 'Newton', 'Amherst', 'Plymouth']],
    ['MI', 'Michigan', 10.0, ['Detroit', 'Ann Arbor', 'Grand Rapids', 'Lansing', 'Flint', 'Kalamazoo', 'Traverse City', 'Dearborn']],
    ['MN', 'Minnesota', 5.7, ['Minneapolis', 'St. Paul', 'Duluth', 'Rochester', 'Bloomington', 'St. Cloud']],
    ['MS', 'Mississippi', 2.9, ['Jackson', 'Oxford', 'Gulfport', 'Hattiesburg', 'Tupelo', 'Starkville']],
    ['MO', 'Missouri', 6.2, ['St. Louis', 'Kansas City', 'Columbia', 'Springfield', 'Independence', 'Joplin']],
    ['MT', 'Montana', 1.1, ['Billings', 'Missoula', 'Bozeman', 'Great Falls', 'Helena']],
    ['NE', 'Nebraska', 2.0, ['Omaha', 'Lincoln', 'Grand Island', 'Kearney', 'Bellevue']],
    ['NV', 'Nevada', 3.2, ['Las Vegas', 'Reno', 'Henderson', 'Carson City', 'Elko']],
    ['NH', 'New Hampshire', 1.4, ['Manchester', 'Concord', 'Nashua', 'Portsmouth', 'Hanover']],
    ['NJ', 'New Jersey', 9.3, ['Newark', 'Princeton', 'Jersey City', 'Trenton', 'Hoboken', 'Paterson', 'Camden', 'Edison', 'Toms River']],
    ['NM', 'New Mexico', 2.1, ['Albuquerque', 'Santa Fe', 'Las Cruces', 'Roswell', 'Taos']],
    ['NY', 'New York', 19.6, ['New York City', 'Buffalo', 'Rochester', 'Albany', 'Syracuse', 'Brooklyn', 'Yonkers', 'Ithaca', 'White Plains', 'Long Island', 'Schenectady', 'Binghamton']],
    ['NC', 'North Carolina', 10.8, ['Charlotte', 'Raleigh', 'Durham', 'Asheville', 'Greensboro', 'Wilmington', 'Chapel Hill', 'Winston-Salem', 'Fayetteville']],
    ['ND', 'North Dakota', 0.8, ['Fargo', 'Bismarck', 'Grand Forks', 'Minot']],
    ['OH', 'Ohio', 11.8, ['Columbus', 'Cleveland', 'Cincinnati', 'Dayton', 'Toledo', 'Akron', 'Youngstown', 'Athens', 'Canton']],
    ['OK', 'Oklahoma', 4.0, ['Oklahoma City', 'Tulsa', 'Norman', 'Stillwater', 'Edmond', 'Lawton']],
    ['OR', 'Oregon', 4.2, ['Portland', 'Eugene', 'Salem', 'Bend', 'Corvallis', 'Medford']],
    ['PA', 'Pennsylvania', 13.0, ['Philadelphia', 'Pittsburgh', 'State College', 'Allentown', 'Erie', 'Harrisburg', 'Scranton', 'Lancaster', 'Bethlehem']],
    ['PR', 'Puerto Rico', 3.2, ['San Juan', 'Ponce', 'Mayagüez', 'Bayamón', 'Caguas']],
    ['RI', 'Rhode Island', 1.1, ['Providence', 'Newport', 'Warwick', 'Cranston']],
    ['SC', 'South Carolina', 5.3, ['Charleston', 'Columbia', 'Greenville', 'Myrtle Beach', 'Spartanburg', 'Rock Hill']],
    ['SD', 'South Dakota', 0.9, ['Sioux Falls', 'Rapid City', 'Aberdeen', 'Brookings']],
    ['TN', 'Tennessee', 7.0, ['Nashville', 'Memphis', 'Knoxville', 'Chattanooga', 'Murfreesboro', 'Clarksville', 'Franklin']],
    ['TX', 'Texas', 30.0, ['Houston', 'Austin', 'Dallas', 'San Antonio', 'El Paso', 'Fort Worth', 'Plano', 'Lubbock', 'Corpus Christi', 'Arlington', 'Laredo', 'McAllen', 'Waco', 'College Station']],
    ['UT', 'Utah', 3.4, ['Salt Lake City', 'Provo', 'Ogden', 'St. George', 'Logan', 'Orem']],
    ['VT', 'Vermont', 0.6, ['Burlington', 'Montpelier', 'Rutland', 'Brattleboro']],
    ['VA', 'Virginia', 8.7, ['Richmond', 'Arlington', 'Norfolk', 'Charlottesville', 'Virginia Beach', 'Alexandria', 'Roanoke', 'Blacksburg']],
    ['WA', 'Washington', 7.8, ['Seattle', 'Spokane', 'Tacoma', 'Bellevue', 'Olympia', 'Vancouver', 'Bellingham', 'Yakima']],
    ['WV', 'West Virginia', 1.8, ['Charleston', 'Morgantown', 'Huntington', 'Wheeling', 'Parkersburg']],
    ['WI', 'Wisconsin', 5.9, ['Milwaukee', 'Madison', 'Green Bay', 'Kenosha', 'Eau Claire', 'Appleton', 'La Crosse']],
    ['WY', 'Wyoming', 0.6, ['Cheyenne', 'Casper', 'Laramie', 'Jackson', 'Sheridan']]
  ].map(([code, name, pop, cities]) => ({ code, name, pop, cities }));

  // International hometowns. Bigger senders list more cities. Students from abroad get names from their own country.
  const INTERNATIONAL = [
    ['Toronto', 'Canada'], ['Vancouver', 'Canada'], ['Montreal', 'Canada'], ['Calgary', 'Canada'], ['Ottawa', 'Canada'], ['Edmonton', 'Canada'],
    ['Mexico City', 'Mexico'], ['Guadalajara', 'Mexico'], ['Monterrey', 'Mexico'], ['Puebla', 'Mexico'], ['Mérida', 'Mexico'],
    ['London', 'United Kingdom'], ['Manchester', 'United Kingdom'], ['Edinburgh', 'United Kingdom'], ['Birmingham', 'United Kingdom'], ['Bristol', 'United Kingdom'], ['Glasgow', 'United Kingdom'],
    ['Seoul', 'South Korea'], ['Busan', 'South Korea'], ['Incheon', 'South Korea'], ['Daegu', 'South Korea'],
    ['Mumbai', 'India'], ['Bengaluru', 'India'], ['Delhi', 'India'], ['Chennai', 'India'], ['Hyderabad', 'India'], ['Pune', 'India'], ['Kolkata', 'India'], ['Ahmedabad', 'India'],
    ['Lagos', 'Nigeria'], ['Abuja', 'Nigeria'], ['Port Harcourt', 'Nigeria'], ['Ibadan', 'Nigeria'],
    ['São Paulo', 'Brazil'], ['Rio de Janeiro', 'Brazil'], ['Brasília', 'Brazil'], ['Belo Horizonte', 'Brazil'], ['Recife', 'Brazil'],
    ['Shanghai', 'China'], ['Beijing', 'China'], ['Shenzhen', 'China'], ['Guangzhou', 'China'], ['Hangzhou', 'China'], ['Chengdu', 'China'], ['Nanjing', 'China'], ['Wuhan', 'China'],
    ['Berlin', 'Germany'], ['Munich', 'Germany'], ['Hamburg', 'Germany'], ['Frankfurt', 'Germany'], ['Cologne', 'Germany'],
    ['Manila', 'Philippines'], ['Cebu', 'Philippines'], ['Davao', 'Philippines'], ['Quezon City', 'Philippines'],
    ['Sydney', 'Australia'], ['Melbourne', 'Australia'], ['Brisbane', 'Australia'], ['Perth', 'Australia'],
    ['Nairobi', 'Kenya'], ['Mombasa', 'Kenya'], ['Kisumu', 'Kenya'],
    ['Hanoi', 'Vietnam'], ['Ho Chi Minh City', 'Vietnam'], ['Da Nang', 'Vietnam'],
    ['Tokyo', 'Japan'], ['Osaka', 'Japan'], ['Kyoto', 'Japan'], ['Yokohama', 'Japan'], ['Fukuoka', 'Japan'],
    ['Paris', 'France'], ['Lyon', 'France'], ['Marseille', 'France'], ['Toulouse', 'France'],
    ['Accra', 'Ghana'], ['Kumasi', 'Ghana'],
    ['Madrid', 'Spain'], ['Barcelona', 'Spain'], ['Valencia', 'Spain'], ['Seville', 'Spain'],
    ['Rome', 'Italy'], ['Milan', 'Italy'], ['Naples', 'Italy'], ['Florence', 'Italy'], ['Turin', 'Italy'],
    ['Cairo', 'Egypt'], ['Alexandria', 'Egypt'], ['Giza', 'Egypt'],
    ['Istanbul', 'Turkey'], ['Ankara', 'Turkey'], ['Izmir', 'Turkey'],
    ['Karachi', 'Pakistan'], ['Lahore', 'Pakistan'], ['Islamabad', 'Pakistan'],
    ['Dhaka', 'Bangladesh'], ['Chittagong', 'Bangladesh'],
    ['Jakarta', 'Indonesia'], ['Surabaya', 'Indonesia'], ['Bandung', 'Indonesia'], ['Bali', 'Indonesia'],
    ['Bangkok', 'Thailand'], ['Chiang Mai', 'Thailand'], ['Phuket', 'Thailand'],
    ['Bogotá', 'Colombia'], ['Medellín', 'Colombia'], ['Cali', 'Colombia'],
    ['Buenos Aires', 'Argentina'], ['Córdoba', 'Argentina'], ['Rosario', 'Argentina'],
    ['Lima', 'Peru'], ['Arequipa', 'Peru'], ['Cusco', 'Peru'],
    ['Santiago', 'Chile'], ['Valparaíso', 'Chile'],
    ['Kingston', 'Jamaica'], ['Montego Bay', 'Jamaica'],
    ['Santo Domingo', 'Dominican Republic'], ['Santiago de los Caballeros', 'Dominican Republic'],
    ['Riyadh', 'Saudi Arabia'], ['Jeddah', 'Saudi Arabia'], ['Dammam', 'Saudi Arabia'],
    ['Dubai', 'United Arab Emirates'], ['Abu Dhabi', 'United Arab Emirates'],
    ['Tel Aviv', 'Israel'], ['Jerusalem', 'Israel'], ['Haifa', 'Israel'],
    ['Addis Ababa', 'Ethiopia'], ['Bahir Dar', 'Ethiopia'],
    ['Johannesburg', 'South Africa'], ['Cape Town', 'South Africa'], ['Durban', 'South Africa'], ['Pretoria', 'South Africa'],
    ['Casablanca', 'Morocco'], ['Rabat', 'Morocco'], ['Marrakesh', 'Morocco'],
    ['Amsterdam', 'Netherlands'], ['Rotterdam', 'Netherlands'], ['Utrecht', 'Netherlands'],
    ['Stockholm', 'Sweden'], ['Gothenburg', 'Sweden'], ['Uppsala', 'Sweden'],
    ['Warsaw', 'Poland'], ['Kraków', 'Poland'], ['Wrocław', 'Poland'],
    ['Dublin', 'Ireland'], ['Cork', 'Ireland'], ['Galway', 'Ireland'],
    ['Athens', 'Greece'], ['Thessaloniki', 'Greece'],
    ['Kyiv', 'Ukraine'], ['Lviv', 'Ukraine'], ['Odesa', 'Ukraine'],
    ['Auckland', 'New Zealand'], ['Wellington', 'New Zealand'], ['Christchurch', 'New Zealand'],
    ['Singapore', 'Singapore'],
    ['Taipei', 'Taiwan'], ['Kaohsiung', 'Taiwan'], ['Taichung', 'Taiwan'],
    ['Kuala Lumpur', 'Malaysia'], ['Penang', 'Malaysia'],
    ['Kathmandu', 'Nepal'], ['Pokhara', 'Nepal']
  ];
  // [women's first names, men's first names, family names] by country.
  const INTL_NAMES = {
    'Canada': [['Emma', 'Olivia', 'Charlotte', 'Chloé', 'Léa', 'Maya', 'Avery', 'Sophie'], ['Liam', 'Noah', 'William', 'Félix', 'Owen', 'Lucas', 'Benjamin', 'Nathan'], ['Tremblay', 'Gagnon', 'Roy', 'MacDonald', 'Campbell', 'Wilson', 'Côté', 'Leblanc', 'Martin', 'Smith']],
    'Mexico': [['Sofía', 'Valentina', 'Regina', 'Ximena', 'Camila', 'Renata', 'Mariana', 'Fernanda'], ['Santiago', 'Mateo', 'Diego', 'Emiliano', 'Leonardo', 'Sebastián', 'Iker', 'Alejandro'], ['Hernández', 'García', 'Martínez', 'López', 'González', 'Rodríguez', 'Pérez', 'Sánchez', 'Ramírez', 'Flores']],
    'United Kingdom': [['Olivia', 'Amelia', 'Isla', 'Ava', 'Freya', 'Poppy', 'Imogen', 'Harriet'], ['Oliver', 'George', 'Harry', 'Arthur', 'Alfie', 'Freddie', 'Archie', 'Rory'], ['Smith', 'Jones', 'Taylor', 'Brown', 'Evans', 'Wright', 'Hughes', 'Patel', 'Thompson', 'Clarke']],
    'South Korea': [['Seo-yeon', 'Ji-woo', 'Ha-eun', 'Min-seo', 'Su-ah', 'Ye-jin', 'Da-eun', 'Yu-na'], ['Min-jun', 'Seo-jun', 'Do-yun', 'Ha-joon', 'Ji-ho', 'Jun-woo', 'Hyun-woo', 'Ye-jun'], ['Kim', 'Lee', 'Park', 'Choi', 'Jung', 'Kang', 'Cho', 'Yoon', 'Jang', 'Lim']],
    'India': [['Aanya', 'Diya', 'Ananya', 'Ishita', 'Saanvi', 'Priya', 'Kavya', 'Meera'], ['Aarav', 'Vihaan', 'Arjun', 'Rohan', 'Aditya', 'Karthik', 'Siddharth', 'Ishaan'], ['Sharma', 'Patel', 'Reddy', 'Iyer', 'Gupta', 'Nair', 'Singh', 'Rao', 'Mehta', 'Kapoor']],
    'Nigeria': [['Chiamaka', 'Adaeze', 'Funmilayo', 'Ngozi', 'Amara', 'Temitope', 'Zainab', 'Ifeoma'], ['Chinedu', 'Oluwaseun', 'Emeka', 'Tunde', 'Ibrahim', 'Obinna', 'Ayodele', 'Kelechi'], ['Okafor', 'Adeyemi', 'Okonkwo', 'Bello', 'Eze', 'Adebayo', 'Nwosu', 'Abubakar', 'Olawale', 'Obi']],
    'Brazil': [['Ana', 'Beatriz', 'Júlia', 'Larissa', 'Mariana', 'Gabriela', 'Letícia', 'Isabela'], ['João', 'Pedro', 'Gabriel', 'Lucas', 'Matheus', 'Rafael', 'Thiago', 'Gustavo'], ['Silva', 'Santos', 'Oliveira', 'Souza', 'Costa', 'Pereira', 'Almeida', 'Ferreira', 'Carvalho', 'Rocha']],
    'China': [['Mei', 'Xinyi', 'Yuxuan', 'Zihan', 'Ying', 'Jiayi', 'Lingling', 'Xiaoling'], ['Wei', 'Hao', 'Jun', 'Zihao', 'Yichen', 'Ming', 'Tao', 'Haoran'], ['Wang', 'Li', 'Zhang', 'Liu', 'Chen', 'Yang', 'Huang', 'Zhao', 'Wu', 'Zhou']],
    'Germany': [['Emma', 'Mia', 'Hannah', 'Lena', 'Lea', 'Johanna', 'Clara', 'Marie'], ['Lukas', 'Leon', 'Finn', 'Jonas', 'Felix', 'Maximilian', 'Paul', 'Niklas'], ['Müller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Meyer', 'Wagner', 'Becker', 'Hoffmann', 'Koch']],
    'Philippines': [['Maria', 'Angel', 'Princess', 'Andrea', 'Kristine', 'Nicole', 'Bea', 'Patricia'], ['Jose', 'John Paul', 'Mark', 'Miguel', 'Carlo', 'Joshua', 'Paolo', 'Rafael'], ['Santos', 'Reyes', 'Cruz', 'Bautista', 'Garcia', 'Mendoza', 'Ramos', 'Villanueva', 'Dela Cruz', 'Aquino']],
    'Australia': [['Charlotte', 'Isla', 'Matilda', 'Ruby', 'Zoe', 'Grace', 'Chloe', 'Sienna'], ['Jack', 'Oliver', 'William', 'Lachlan', 'Cooper', 'Hamish', 'Thomas', 'Riley'], ['Smith', 'Jones', 'Williams', 'Brown', 'Wilson', 'Taylor', 'Nguyen', 'Kelly', 'Ryan', 'Murphy']],
    'Kenya': [['Wanjiru', 'Akinyi', 'Njeri', 'Chebet', 'Atieno', 'Wambui', 'Nyambura', 'Jepchirchir'], ['Kamau', 'Otieno', 'Kipchoge', 'Mwangi', 'Odhiambo', 'Kiprono', 'Njoroge', 'Baraka'], ['Mwangi', 'Ochieng', 'Kariuki', 'Wanjala', 'Kiprop', 'Mutua', 'Omondi', 'Kimani', 'Cheruiyot', 'Njoroge']],
    'Vietnam': [['Linh', 'Trang', 'Huong', 'Mai', 'Ngoc', 'Thao', 'Anh', 'Phuong'], ['Minh', 'Duc', 'Huy', 'Khoa', 'Tuan', 'Bao', 'Long', 'Quang'], ['Nguyen', 'Tran', 'Le', 'Pham', 'Hoang', 'Phan', 'Vu', 'Dang', 'Bui', 'Do']],
    'Japan': [['Yui', 'Hina', 'Sakura', 'Aoi', 'Rin', 'Mei', 'Haruka', 'Yuna'], ['Haruto', 'Sota', 'Ren', 'Yuto', 'Riku', 'Kaito', 'Takumi', 'Hiroshi'], ['Sato', 'Suzuki', 'Takahashi', 'Tanaka', 'Watanabe', 'Ito', 'Yamamoto', 'Nakamura', 'Kobayashi', 'Kato']],
    'France': [['Camille', 'Léa', 'Manon', 'Chloé', 'Inès', 'Louise', 'Juliette', 'Margaux'], ['Louis', 'Gabriel', 'Hugo', 'Arthur', 'Jules', 'Raphaël', 'Théo', 'Antoine'], ['Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Moreau', 'Laurent', 'Lefebvre', 'Girard', 'Fournier']],
    'Ghana': [['Akosua', 'Ama', 'Abena', 'Efua', 'Adwoa', 'Yaa', 'Esi', 'Afua'], ['Kwame', 'Kofi', 'Kwabena', 'Yaw', 'Kwaku', 'Kojo', 'Kwesi', 'Nana'], ['Mensah', 'Asante', 'Owusu', 'Boateng', 'Osei', 'Appiah', 'Agyeman', 'Darko', 'Addo', 'Ofori']],
    'Spain': [['Lucía', 'Martina', 'Paula', 'Carmen', 'Alba', 'Elena', 'Noa', 'Irene'], ['Hugo', 'Pablo', 'Álvaro', 'Daniel', 'Javier', 'Marcos', 'Adrián', 'Mario'], ['García', 'Fernández', 'González', 'Rodríguez', 'López', 'Martínez', 'Sánchez', 'Romero', 'Navarro', 'Torres']],
    'Italy': [['Giulia', 'Sofia', 'Aurora', 'Martina', 'Chiara', 'Francesca', 'Alice', 'Elena'], ['Leonardo', 'Francesco', 'Alessandro', 'Lorenzo', 'Matteo', 'Andrea', 'Marco', 'Luca'], ['Rossi', 'Russo', 'Ferrari', 'Esposito', 'Bianchi', 'Romano', 'Colombo', 'Ricci', 'Marino', 'Greco']],
    'Egypt': [['Nour', 'Mariam', 'Salma', 'Farida', 'Malak', 'Yasmin', 'Habiba', 'Laila'], ['Omar', 'Youssef', 'Ahmed', 'Mohamed', 'Karim', 'Ali', 'Hassan', 'Mostafa'], ['Hassan', 'Ibrahim', 'Mahmoud', 'Mostafa', 'El-Sayed', 'Abdelrahman', 'Fawzy', 'Nasser', 'Saleh', 'Farouk']],
    'Turkey': [['Zeynep', 'Elif', 'Defne', 'Ecrin', 'Azra', 'Ayşe', 'Ela', 'Selin'], ['Yusuf', 'Emir', 'Mehmet', 'Mustafa', 'Kerem', 'Arda', 'Can', 'Burak'], ['Yılmaz', 'Kaya', 'Demir', 'Şahin', 'Çelik', 'Yıldız', 'Aydın', 'Öztürk', 'Arslan', 'Doğan']],
    'Pakistan': [['Ayesha', 'Fatima', 'Hira', 'Maryam', 'Zara', 'Sana', 'Iqra', 'Mahnoor'], ['Ali', 'Hamza', 'Bilal', 'Usman', 'Ahmed', 'Hassan', 'Zain', 'Saad'], ['Khan', 'Ahmed', 'Malik', 'Hussain', 'Qureshi', 'Siddiqui', 'Chaudhry', 'Raza', 'Butt', 'Sheikh']],
    'Bangladesh': [['Nusrat', 'Tasnim', 'Farzana', 'Sadia', 'Anika', 'Riya', 'Tahmina', 'Mim'], ['Rahim', 'Tanvir', 'Arif', 'Sakib', 'Imran', 'Fahim', 'Rafi', 'Nayeem'], ['Rahman', 'Hossain', 'Islam', 'Ahmed', 'Chowdhury', 'Akter', 'Sarker', 'Uddin', 'Khan', 'Begum']],
    'Indonesia': [['Putri', 'Siti', 'Dewi', 'Ayu', 'Nadia', 'Rani', 'Intan', 'Sari'], ['Budi', 'Agus', 'Rizky', 'Dimas', 'Arif', 'Fajar', 'Bayu', 'Andi'], ['Santoso', 'Wijaya', 'Saputra', 'Hidayat', 'Pratama', 'Kurniawan', 'Setiawan', 'Gunawan', 'Halim', 'Siregar']],
    'Thailand': [['Ploy', 'Nicha', 'Ploypailin', 'Siriporn', 'Kanya', 'Malee', 'Naree', 'Pim'], ['Somchai', 'Anan', 'Krit', 'Nattapong', 'Thanakorn', 'Pakorn', 'Chai', 'Arthit'], ['Srisuk', 'Wongsa', 'Chaiyaporn', 'Rattanakorn', 'Somboon', 'Thongchai', 'Kittisak', 'Boonmee', 'Saetang', 'Phromma']],
    'Colombia': [['Valentina', 'Isabella', 'Mariana', 'Daniela', 'Sara', 'Gabriela', 'Juliana', 'Camila'], ['Santiago', 'Sebastián', 'Juan José', 'Samuel', 'Nicolás', 'Andrés', 'Felipe', 'Mateo'], ['Rodríguez', 'Gómez', 'Martínez', 'García', 'López', 'Hernández', 'Restrepo', 'Ospina', 'Vargas', 'Castro']],
    'Argentina': [['Sofía', 'Martina', 'Catalina', 'Delfina', 'Valentina', 'Agustina', 'Lucía', 'Florencia'], ['Mateo', 'Bautista', 'Thiago', 'Santino', 'Joaquín', 'Facundo', 'Tomás', 'Franco'], ['González', 'Rodríguez', 'Fernández', 'López', 'Romero', 'Sosa', 'Álvarez', 'Benítez', 'Acosta', 'Medina']],
    'Peru': [['Camila', 'Valeria', 'Ximena', 'Luciana', 'Andrea', 'Fiorella', 'Rosa', 'Milagros'], ['Santiago', 'Diego', 'José', 'Renato', 'Luis', 'Jorge', 'Piero', 'Carlos'], ['Quispe', 'Flores', 'Huamán', 'Mamani', 'Rojas', 'Vargas', 'Chávez', 'Torres', 'Ramos', 'Castillo']],
    'Chile': [['Sofía', 'Isidora', 'Florencia', 'Agustina', 'Antonia', 'Josefa', 'Trinidad', 'Catalina'], ['Agustín', 'Benjamín', 'Vicente', 'Martín', 'Matías', 'Cristóbal', 'Tomás', 'Joaquín'], ['González', 'Muñoz', 'Rojas', 'Díaz', 'Pérez', 'Soto', 'Contreras', 'Silva', 'Martínez', 'Sepúlveda']],
    'Jamaica': [['Shanice', 'Tianna', 'Kimberly', 'Annalise', 'Shelly-Ann', 'Rochelle', 'Danielle', 'Kerry-Ann'], ['Andre', 'Jermaine', 'Damion', 'Kemar', 'Rohan', 'Omari', 'Javon', 'Tyrone'], ['Brown', 'Campbell', 'Williams', 'Thompson', 'Clarke', 'Grant', 'McKenzie', 'Reid', 'Gordon', 'Morgan']],
    'Dominican Republic': [['Yaritza', 'Daniela', 'Yamilet', 'Paola', 'Nicole', 'Esmeralda', 'Yokasta', 'Rosanna'], ['Juan Carlos', 'José', 'Luis', 'Miguel', 'Ramón', 'Wilson', 'Yeison', 'Starlin'], ['Peña', 'Reyes', 'Rodríguez', 'Santana', 'Batista', 'Guzmán', 'Almonte', 'De los Santos', 'Polanco', 'Féliz']],
    'Saudi Arabia': [['Noura', 'Sara', 'Lama', 'Reem', 'Haya', 'Jood', 'Shahad', 'Dana'], ['Abdullah', 'Mohammed', 'Faisal', 'Khalid', 'Saud', 'Turki', 'Fahad', 'Nasser'], ['Al-Saud', 'Al-Qahtani', 'Al-Harbi', 'Al-Otaibi', 'Al-Ghamdi', 'Al-Zahrani', 'Al-Shehri', 'Al-Dosari', 'Al-Mutairi', 'Al-Anazi']],
    'United Arab Emirates': [['Mariam', 'Fatima', 'Hessa', 'Shamma', 'Maitha', 'Alya', 'Mahra', 'Latifa'], ['Mohammed', 'Hamdan', 'Rashid', 'Saeed', 'Khalifa', 'Sultan', 'Majid', 'Ahmed'], ['Al-Maktoum', 'Al-Nahyan', 'Al-Falasi', 'Al-Mansouri', 'Al-Shamsi', 'Al-Ketbi', 'Al-Suwaidi', 'Al-Hammadi', 'Al-Mazrouei', 'Al-Dhaheri']],
    'Israel': [['Noa', 'Tamar', 'Maya', 'Yael', 'Shira', 'Avigail', 'Talia', 'Michal'], ['Noam', 'Ariel', 'Itai', 'Yonatan', 'Eitan', 'Omer', 'Daniel', 'Amit'], ['Cohen', 'Levi', 'Mizrahi', 'Peretz', 'Biton', 'Friedman', 'Avraham', 'Dahan', 'Katz', 'Shapiro']],
    'Ethiopia': [['Hana', 'Selam', 'Meron', 'Bethlehem', 'Liya', 'Tsion', 'Mahlet', 'Rahel'], ['Abebe', 'Dawit', 'Yonas', 'Mekonnen', 'Biniyam', 'Henok', 'Tewodros', 'Natnael'], ['Tesfaye', 'Bekele', 'Girma', 'Haile', 'Tadesse', 'Alemu', 'Kebede', 'Mengistu', 'Wolde', 'Getachew']],
    'South Africa': [['Lerato', 'Thandiwe', 'Amahle', 'Naledi', 'Zanele', 'Lindiwe', 'Chloé', 'Kayla'], ['Sipho', 'Thabo', 'Lwazi', 'Bongani', 'Kagiso', 'Pieter', 'Liam', 'Mandla'], ['Nkosi', 'Dlamini', 'Ndlovu', 'Khumalo', 'Mokoena', 'Van der Merwe', 'Botha', 'Naidoo', 'Mahlangu', 'Zulu']],
    'Morocco': [['Salma', 'Imane', 'Kawtar', 'Yasmine', 'Hiba', 'Rania', 'Asmae', 'Meryem'], ['Youssef', 'Mehdi', 'Hamza', 'Amine', 'Anas', 'Ayoub', 'Omar', 'Reda'], ['Alaoui', 'Benali', 'El Amrani', 'Bennani', 'Tazi', 'Idrissi', 'Berrada', 'Chraibi', 'Lahlou', 'Fassi']],
    'Netherlands': [['Emma', 'Julia', 'Sophie', 'Lotte', 'Anna', 'Fleur', 'Sanne', 'Noor'], ['Daan', 'Sem', 'Lucas', 'Bram', 'Jesse', 'Thijs', 'Ruben', 'Sven'], ['de Jong', 'Jansen', 'de Vries', 'van den Berg', 'Bakker', 'Visser', 'Smit', 'Meijer', 'Mulder', 'de Boer']],
    'Sweden': [['Alice', 'Maja', 'Elsa', 'Astrid', 'Wilma', 'Ebba', 'Freja', 'Saga'], ['William', 'Lucas', 'Elias', 'Oscar', 'Hugo', 'Axel', 'Erik', 'Viktor'], ['Andersson', 'Johansson', 'Karlsson', 'Nilsson', 'Eriksson', 'Larsson', 'Olsson', 'Persson', 'Lindberg', 'Svensson']],
    'Poland': [['Zuzanna', 'Julia', 'Maja', 'Zofia', 'Hanna', 'Aleksandra', 'Natalia', 'Wiktoria'], ['Jakub', 'Antoni', 'Szymon', 'Jan', 'Filip', 'Kacper', 'Mateusz', 'Piotr'], ['Nowak', 'Kowalski', 'Wiśniewski', 'Wójcik', 'Kamiński', 'Lewandowski', 'Zieliński', 'Szymański', 'Woźniak', 'Dąbrowski']],
    'Ireland': [['Aoife', 'Saoirse', 'Ciara', 'Niamh', 'Sinéad', 'Róisín', 'Orla', 'Clodagh'], ['Seán', 'Cian', 'Oisín', 'Darragh', 'Conor', 'Fionn', 'Liam', 'Ronan'], ['Murphy', 'Kelly', 'O’Sullivan', 'Walsh', 'Byrne', 'Ryan', 'O’Connor', 'O’Brien', 'Doyle', 'McCarthy']],
    'Greece': [['Maria', 'Eleni', 'Katerina', 'Sofia', 'Georgia', 'Ioanna', 'Dimitra', 'Anastasia'], ['Georgios', 'Dimitris', 'Nikos', 'Konstantinos', 'Giannis', 'Alexandros', 'Christos', 'Panagiotis'], ['Papadopoulos', 'Pappas', 'Nikolaidis', 'Georgiou', 'Karagiannis', 'Vlachos', 'Antoniou', 'Oikonomou', 'Makris', 'Dimitriou']],
    'Ukraine': [['Anastasiia', 'Sofiia', 'Daryna', 'Yuliia', 'Kateryna', 'Viktoriia', 'Oksana', 'Iryna'], ['Oleksandr', 'Andrii', 'Dmytro', 'Maksym', 'Bohdan', 'Taras', 'Yaroslav', 'Mykola'], ['Melnyk', 'Shevchenko', 'Kovalenko', 'Bondarenko', 'Tkachenko', 'Kravchenko', 'Oliinyk', 'Boyko', 'Koval', 'Moroz']],
    'New Zealand': [['Isla', 'Charlotte', 'Olivia', 'Amelia', 'Aroha', 'Mia', 'Ruby', 'Hana'], ['Oliver', 'Jack', 'Noah', 'Leo', 'Nikau', 'Hunter', 'George', 'Tama'], ['Smith', 'Wilson', 'Williams', 'Brown', 'Taylor', 'Ngata', 'Parata', 'Walker', 'Anderson', 'Thompson']],
    'Singapore': [['Hui Min', 'Xin Yi', 'Nur Aisyah', 'Priya', 'Jia Hui', 'Siti', 'Wen Qi', 'Shu Fen'], ['Wei Jie', 'Jun Hao', 'Muhammad', 'Arjun', 'Zhi Hao', 'Darren', 'Ryan', 'Kai Xiang'], ['Tan', 'Lim', 'Lee', 'Ng', 'Ong', 'Wong', 'Goh', 'Chua', 'Rahman', 'Pillai']],
    'Taiwan': [['Yi-Ting', 'Ya-Ting', 'Hsin-Yi', 'Shu-Fen', 'Pei-Shan', 'Yu-Chen', 'Wan-Ting', 'Chia-Hui'], ['Chia-Hao', 'Chih-Ming', 'Yu-Hsiang', 'Po-Wei', 'Chun-Hung', 'Kuan-Ting', 'Wei-Lun', 'Tsung-Han'], ['Chen', 'Lin', 'Huang', 'Chang', 'Lee', 'Wang', 'Wu', 'Liu', 'Tsai', 'Yang']],
    'Malaysia': [['Nurul', 'Siti', 'Aisyah', 'Mei Ling', 'Kavitha', 'Farah', 'Hui Wen', 'Aina'], ['Muhammad', 'Ahmad', 'Hafiz', 'Wei Ming', 'Arvind', 'Amir', 'Jia Wei', 'Danial'], ['Abdullah', 'Rahman', 'Ismail', 'Tan', 'Lim', 'Wong', 'Krishnan', 'Hassan', 'Ong', 'Yusof']],
    'Nepal': [['Sita', 'Anjali', 'Sunita', 'Pooja', 'Srijana', 'Asmita', 'Kabita', 'Prakriti'], ['Aayush', 'Bibek', 'Sandesh', 'Sagar', 'Prakash', 'Roshan', 'Suman', 'Nabin'], ['Shrestha', 'Gurung', 'Thapa', 'Tamang', 'Rai', 'Adhikari', 'Karki', 'Magar', 'Sharma', 'Poudel']]
  };

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
  // Courses most students take senior year. Applications go in before those exams, so they have no score yet.
  const SENIOR_APS = [
    'Calculus BC', 'English Literature', 'Physics C: Mechanics', 'US Government', 'Comparative Government',
    'Macroeconomics', 'Microeconomics', 'Statistics', 'Psychology', 'Research', 'Physics 2'
  ];
  // Pairs a student wouldn't take both of.
  const AP_EXCLUSIVE = [['Calculus AB', 'Calculus BC']];

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

  // Every program is its own team: men's and women's squads are separate, and only co-ed esports mixes them.
  // g = who it recruits ('M', 'F', or null for co-ed). roster = full team size. games = games (or meets) per season.
  // cost = yearly program cost. revenue = ticket and media money for a .500 season.
  const S = (id, base, g, roster, games, cost, revenue) => ({
    id, base, g, roster, games, cost, revenue,
    name: (g === 'M' ? 'Men’s ' : g === 'F' ? 'Women’s ' : '') + base
  });
  const SPORTS = [
    S('m-football', 'Football', 'M', 85, 12, 2600000, 2200000),
    S('m-basketball', 'Basketball', 'M', 15, 30, 1000000, 1100000),
    S('m-baseball', 'Baseball', 'M', 35, 50, 600000, 250000),
    S('m-soccer', 'Soccer', 'M', 28, 18, 300000, 60000),
    S('m-volleyball', 'Volleyball', 'M', 18, 26, 220000, 20000),
    S('m-hockey', 'Ice Hockey', 'M', 28, 34, 900000, 600000),
    S('m-lacrosse', 'Lacrosse', 'M', 45, 15, 400000, 60000),
    S('m-swim', 'Swimming & Diving', 'M', 28, 12, 300000, 15000),
    S('m-track', 'Track & Field', 'M', 45, 10, 260000, 15000),
    S('m-xc', 'Cross Country', 'M', 14, 8, 90000, 5000),
    S('m-tennis', 'Tennis', 'M', 10, 22, 140000, 10000),
    S('m-golf', 'Golf', 'M', 10, 10, 160000, 15000),
    S('m-wrestling', 'Wrestling', 'M', 30, 16, 340000, 60000),
    S('m-rowing', 'Rowing', 'M', 40, 8, 350000, 10000),
    S('m-gymnastics', 'Gymnastics', 'M', 18, 12, 300000, 20000),
    S('m-waterpolo', 'Water Polo', 'M', 24, 26, 220000, 10000),
    S('w-basketball', 'Basketball', 'F', 15, 30, 700000, 300000),
    S('w-softball', 'Softball', 'F', 25, 50, 420000, 90000),
    S('w-soccer', 'Soccer', 'F', 28, 18, 300000, 70000),
    S('w-volleyball', 'Volleyball', 'F', 18, 28, 300000, 100000),
    S('w-beachvb', 'Beach Volleyball', 'F', 16, 20, 180000, 15000),
    S('w-hockey', 'Ice Hockey', 'F', 24, 32, 600000, 80000),
    S('w-lacrosse', 'Lacrosse', 'F', 35, 17, 350000, 30000),
    S('w-fieldhockey', 'Field Hockey', 'F', 24, 18, 330000, 20000),
    S('w-swim', 'Swimming & Diving', 'F', 30, 12, 300000, 15000),
    S('w-track', 'Track & Field', 'F', 45, 10, 260000, 15000),
    S('w-xc', 'Cross Country', 'F', 14, 8, 90000, 5000),
    S('w-tennis', 'Tennis', 'F', 10, 22, 140000, 10000),
    S('w-golf', 'Golf', 'F', 9, 10, 150000, 10000),
    S('w-wrestling', 'Wrestling', 'F', 25, 14, 220000, 15000),
    S('w-rowing', 'Rowing', 'F', 55, 8, 450000, 10000),
    S('w-gymnastics', 'Gymnastics', 'F', 16, 12, 400000, 90000),
    S('w-waterpolo', 'Water Polo', 'F', 24, 26, 220000, 10000),
    S('esports', 'Esports', null, 12, 20, 180000, 40000)
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

  // Career outcomes by major: [median starting salary, share employed or in grad school within six months].
  const OUTCOMES = {
    bio: [42000, 0.86], chem: [52000, 0.88], phys: [60000, 0.89], math: [62000, 0.9], stat: [68000, 0.92],
    envs: [45000, 0.84], neuro: [45000, 0.88], bchm: [50000, 0.89], mbio: [40000, 0.8], geol: [55000, 0.86], astr: [58000, 0.85],
    cs: [80000, 0.9], data: [78000, 0.91], engr: [70000, 0.92], mech: [72000, 0.93], elec: [75000, 0.93], civil: [66000, 0.94],
    bme: [68000, 0.88], cheme: [77000, 0.93], aero: [74000, 0.91], cyber: [75000, 0.93], infosys: [66000, 0.91],
    nurs: [72000, 0.96], kin: [40000, 0.85], pubh: [45000, 0.86], pharm: [60000, 0.9], nutr: [46000, 0.86], hsci: [45000, 0.87],
    bus: [58000, 0.89], fin: [66000, 0.91], acct: [60000, 0.94], mktg: [52000, 0.88], entr: [50000, 0.82], hosp: [44000, 0.9],
    scm: [62000, 0.93], sptm: [42000, 0.84],
    econ: [63000, 0.89], psych: [40000, 0.83], poli: [46000, 0.85], crim: [42000, 0.86], soc: [40000, 0.82], anth: [40000, 0.8],
    intl: [48000, 0.84], geog: [46000, 0.84], ling: [44000, 0.82], cogs: [55000, 0.86], gws: [38000, 0.8],
    hist: [42000, 0.82], engl: [42000, 0.81], lang: [42000, 0.83], phil: [46000, 0.82], rel: [38000, 0.8], clas: [42000, 0.82],
    afam: [40000, 0.81], cwri: [38000, 0.76],
    art: [36000, 0.74], mus: [36000, 0.76], film: [40000, 0.75], thea: [35000, 0.72], danc: [32000, 0.72], gdes: [47000, 0.84],
    fash: [42000, 0.78], game: [60000, 0.8], anim: [50000, 0.78], photo: [34000, 0.72],
    edu: [44000, 0.93], comm: [46000, 0.84], jour: [42000, 0.8], arch: [55000, 0.88], agri: [50000, 0.92], ansc: [42000, 0.86],
    socw: [40000, 0.9], legal: [46000, 0.85], fors: [48000, 0.84], avia: [65000, 0.9], cmgt: [68000, 0.95], plan: [52000, 0.87],
    undeclared: [38000, 0.74]
  };

  // NCAA-style divisions. schol = athletic scholarship per recruit per year. revenue scales ticket and media money.
  // starTilt shifts recruits toward higher star ratings. appMult is the exposure the division brings to admissions.
  const DIVISIONS = {
    D3: { label: 'Division III', rank: 3, schol: 0, revenue: 0.6, starTilt: 0, yield: 1, appMult: 1, minPrograms: 0, minWomen: 0, minPrestige: 0, fee: 0, transition: 0,
      note: 'No athletic scholarships. Students play for the love of it.' },
    D2: { label: 'Division II', rank: 2, schol: 7000, revenue: 1, starTilt: 0.5, yield: 1.1, appMult: 1.03, minPrograms: 10, minWomen: 5, minPrestige: 0, fee: 1500000, transition: 1,
      note: 'Partial scholarships and regional rivalries.' },
    D1: { label: 'Division I', rank: 1, schol: 18000, revenue: 1.8, starTilt: 1.2, yield: 1.25, appMult: 1.08, minPrograms: 14, minWomen: 7, minPrestige: 40, fee: 8000000, transition: 2,
      note: 'Full scholarships, national TV and the biggest stage in college sports.' }
  };

  // Fictional Division II and III conferences. Division I uses the real conferences in js/schools.js.
  // tv = yearly media payout. minPrestige and needsFootball gate invitations.
  const CONFERENCES = [
    { id: 'heartland', name: 'Heartland Athletic Conference', div: 'D3', tv: 0, minPrestige: 0, needsFootball: false, rivals: ['Prairie View College', 'Millbrook College', 'St. Anselm University', 'Oak Hollow College'] },
    { id: 'lal', name: 'Liberal Arts Athletic League', div: 'D3', tv: 100000, minPrestige: 50, needsFootball: false, rivals: ['Whitmore College', 'Ashbury College', 'Kenwood College', 'Halsey College'] },
    { id: 'greatplains', name: 'Great Plains Conference', div: 'D2', tv: 300000, minPrestige: 0, needsFootball: false, rivals: ['Western Plains University', 'Cobalt State', 'Red River University', 'Northfield State'] },
    { id: 'coastal', name: 'Coastal Valley Conference', div: 'D2', tv: 600000, minPrestige: 45, needsFootball: false, rivals: ['Bayshore University', 'Tidewater State', 'Seacliff University', 'Palmetto Bay College'] }
  ];

  // Admissions office: readers you hire and what recruiting costs.
  const STAFF = { readerCost: 65000, filesPerReader: 600 };
  const RECRUITING = { stateCost: 40000, countryCost: 60000 };

  // Graduate and professional schools. cost = one-time build, upkeep = yearly, capacity = full enrollment.
  // needs = at least one of these undergraduate majors must be open. research feeds grants and prestige.
  const G_ = (id, name, cost, upkeep, tuition, capacity, minPrestige, needs, research, note) => ({ id, name, cost, upkeep, tuition, capacity, minPrestige, needs, research, note });
  const GRAD_PROGRAMS = [
    G_('phd', 'Graduate School of Arts & Sciences', 25000000, 12000000, 15000, 500, 50, ['bio', 'chem', 'phys', 'math', 'psych', 'econ', 'hist', 'engl', 'neuro'], 5, 'PhD programs. Most doctoral students are funded, so tuition is low, but the research is what builds a reputation.'),
    G_('law', 'School of Law', 40000000, 9000000, 48000, 600, 55, ['poli', 'legal', 'hist', 'phil', 'econ', 'crim'], 1.5, 'A law school turns out judges, senators and governors.'),
    G_('med', 'School of Medicine', 150000000, 40000000, 62000, 480, 65, ['bio', 'chem', 'bchm', 'neuro'], 8, 'The most expensive school to run and the biggest research engine.'),
    G_('mba', 'Business School', 30000000, 7000000, 58000, 450, 50, ['bus', 'fin', 'econ', 'acct', 'mktg'], 1, 'MBA tuition pays the bills, and its graduates run companies.'),
    G_('engr', 'Graduate School of Engineering', 60000000, 15000000, 36000, 600, 55, ['engr', 'mech', 'elec', 'civil', 'bme', 'cheme', 'aero', 'cs'], 6, 'Labs, patents and federal research contracts.'),
    G_('pubh', 'School of Public Health', 30000000, 8000000, 36000, 300, 50, ['pubh', 'bio', 'nurs', 'hsci'], 3, 'Epidemiology and health policy research.'),
    G_('policy', 'School of Public Policy', 25000000, 6000000, 42000, 250, 55, ['poli', 'econ', 'intl', 'pubh'], 2, 'Trains diplomats and government leaders.'),
    G_('nursing', 'Graduate School of Nursing', 20000000, 5000000, 35000, 300, 40, ['nurs'], 1, 'Nurse practitioners and nursing faculty.'),
    G_('edu', 'Graduate School of Education', 15000000, 4000000, 26000, 400, 35, ['edu'], 1, 'Master’s degrees for teachers and principals.'),
    G_('arts', 'School of the Arts', 15000000, 4000000, 32000, 200, 45, ['art', 'mus', 'film', 'thea', 'cwri', 'danc'], 0.5, 'MFA programs in writing, film, music and theater.')
  ];

  // Careers that make an alum famous years after graduation. majors: whose graduates can get there.
  // delay: years after graduating. minIdx: how strong a student they had to be.
  const C_ = (id, label, text, majors, delay, minIdx, w, fx) => ({ id, label, text, majors, delay, minIdx, w, fx });
  const CAREERS = [
    C_('senator', 'U.S. Senator', '{name} {yy} was elected to the United States Senate.', ['poli', 'legal', 'hist', 'econ', 'intl', 'phil'], [16, 32], 55, 3, { prestige: 0.6, buzz: 4 }),
    C_('governor', 'Governor', '{name} {yy} was elected governor of {state}.', ['poli', 'legal', 'bus', 'econ', 'crim'], [16, 30], 50, 3, { prestige: 0.4, buzz: 3 }),
    C_('ceo', 'Fortune 500 CEO', '{name} {yy} was named CEO of a Fortune 500 company and pledged {gift} to the school.', ['bus', 'fin', 'econ', 'acct', 'mktg', 'scm', 'engr', 'cs', 'data'], [15, 28], 55, 5, { buzz: 2, gift: [5e6, 25e6] }),
    C_('founder', 'Billion-dollar founder', '{name} {yy} built a billion-dollar company and gave {gift} back.', ['cs', 'data', 'engr', 'entr', 'bus', 'cyber', 'infosys', 'game', 'elec'], [6, 15], 45, 4, { buzz: 5, gift: [10e6, 60e6] }),
    C_('nobel', 'Nobel laureate', '{name} {yy} won the Nobel Prize.', ['phys', 'chem', 'bio', 'bchm', 'neuro', 'econ', 'math', 'med'], [25, 40], 85, 1, { prestige: 2.5, buzz: 7 }),
    C_('astronaut', 'NASA astronaut', '{name} {yy} was selected as a NASA astronaut.', ['aero', 'phys', 'engr', 'mech', 'elec', 'astr'], [10, 20], 75, 2, { prestige: 0.4, buzz: 5 }),
    C_('oscar', 'Oscar winner', '{name} {yy} won an Academy Award.', ['film', 'thea', 'anim', 'cwri', 'mus'], [8, 25], 0, 2, { buzz: 6 }),
    C_('grammy', 'Grammy winner', '{name} {yy} won a Grammy.', ['mus', 'danc', 'thea'], [5, 15], 0, 2, { buzz: 5 }),
    C_('author', 'Pulitzer-winning writer', '{name} {yy} won the Pulitzer Prize.', ['engl', 'cwri', 'jour', 'hist', 'afam'], [10, 28], 60, 2, { prestige: 0.5, buzz: 3 }),
    C_('anchor', 'Network news anchor', '{name} {yy} became the anchor of a national evening newscast.', ['comm', 'jour', 'poli'], [12, 22], 45, 2, { buzz: 4 }),
    C_('surgeon', 'Surgeon General', '{name} {yy} was appointed Surgeon General of the United States.', ['nurs', 'bio', 'neuro', 'pubh', 'hsci', 'med'], [20, 32], 70, 1, { prestige: 0.6, buzz: 3 }),
    C_('justice', 'Supreme Court justice', '{name} {yy} was confirmed to the Supreme Court.', ['poli', 'legal', 'phil', 'law'], [28, 40], 85, 0.4, { prestige: 1.5, buzz: 6 }),
    C_('judge', 'Federal judge', '{name} {yy} was confirmed as a federal judge.', ['poli', 'legal', 'phil', 'hist', 'law'], [18, 30], 65, 2, { prestige: 0.3, buzz: 1 }),
    C_('architect', 'Pritzker Prize architect', '{name} {yy} won the Pritzker Prize for architecture.', ['arch', 'plan'], [20, 35], 60, 1, { prestige: 0.6, buzz: 3 }),
    C_('coach', 'Pro head coach', '{name} {yy} was hired as the head coach of a professional team.', ['kin', 'sptm', 'hsci'], [12, 25], 0, 2, { buzz: 3 }),
    C_('diplomat', 'Ambassador', '{name} {yy} was confirmed as a U.S. ambassador.', ['intl', 'poli', 'lang', 'econ', 'policy'], [15, 28], 60, 2, { prestige: 0.3, buzz: 1 })
  ];
  // Pro leagues that draft from your programs.
  const DRAFTS = {
    'm-football': 'NFL', 'm-basketball': 'NBA', 'w-basketball': 'WNBA', 'm-baseball': 'MLB', 'm-hockey': 'NHL',
    'm-soccer': 'MLS', 'w-soccer': 'NWSL', 'w-volleyball': 'pro volleyball league', 'w-softball': 'pro softball league'
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
    STATES, INTERNATIONAL, INTL_NAMES, FEMALE_NAMES, MALE_NAMES, NEUTRAL_NAMES, FIRST_NAMES, LAST_NAMES, AP_COURSES, SENIOR_APS, AP_EXCLUSIVE,
    AREAS, MAJORS, GEN_ED, SPORTS, CLASS_SIZES, LIFE_TAGS, ACTIVITIES, HOOKS, INCOME, DORMS, HALL_NAMES,
    FRATERNITIES, SORORITIES, GREEK, GREEK_POLICIES, OUTCOMES, DIVISIONS, CONFERENCES, STAFF, RECRUITING, GRAD_PROGRAMS, CAREERS, DRAFTS, MASCOTS, NAME_PARTS, COLOR_PRESETS
  };
})();

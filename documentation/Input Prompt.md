**WHY - Vision & Purpose**

**1. Purpose & Users**  
**What problem are we solving, and for whom?**  
Incepta addresses the fragmentation and inefficiency in translating academic research into marketable innovations. Technology Transfer Offices (TTOs) struggle to connect discoveries with entrepreneurs who can commercialize them. Early-stage founders lack access to these technologies and non-dilutive funding opportunities. This mismatch underutilizes innovations and limits their societal and economic potential. Incepta centralizes technology transfer and funding opportunities, streamlining licensing processes and facilitating grant writing with AI tools.

**What does your application do?**  
Incepta matches academic technologies with entrepreneurs and suitable government grants. It manages intellectual property (IP) workflows, fosters researcher-founder collaboration, and speeds up grant writing via an LLM-powered assistant. It will also build 200 scrapers for all U.S. university technology transfer offices, 75+ scrapers for all U.S. federal research labs with technology transfer offices, and 100+ scrapers for international university technology transfer offices.

**Who will use it?**

1. **TTOs and Innovation Centers:** List discoveries, reduce manual outreach, and secure licensing deals.

2. **Early-stage founders and Entrepreneurs: Discover and license university technologies** and secure funding.

3. **Researchers and Academic Institutions:** Showcase their work to maximize its societal impact.

4. **Accelerators and University Centers:** Help founders identify technologies and funding opportunities.

**Why will they use it instead of alternatives?**

- **Centralized Functionality:** Consolidates listings, matchmaking, and funding guidance.

- **AI-Driven Efficiency:** Streamlines complex processes.

- **Grant Matching Integration:** Offers built-in funding tools and templates.

- **Founder-Focused Design:** Tailored for startups rather than large corporations.

----------

**WHAT - Core Requirements**

**2. Functional Requirements**

 1. System must allow TTOs to manage technology listings (title, abstract, patents, and related metadata).

 2. System must provide AI-based matching for technologies and entrepreneur profiles.

 3. System must allow keyword and filtered searches for technologies and grants.

 4. System must notify users about updates and deadlines in their selected interest areas.

 5. System must recommend grants based on technology readiness and startup profile.

 6. System must assist users in writing grants with an LLM-powered tool.

 7. System must offer secure messaging and document sharing between users.

 8. System must provide IP and licensing management with version tracking and templated agreements.

 9. System must generate user engagement analytics and performance reports.

10. System must enable role-based permissions to restrict access to sensitive data.

11. System must suggest startup ideas by integrating technologies and funding.

12. System must include contact admin functionality for licensing assistance.

----------

**HOW - Planning & Implementation**

**3. Technical Foundation**  
**Required Stack Components:**

- Frontend: Web and mobile interfaces

- Backend: Scalable APIs, secure databases

- Integrations: External grant databases, advanced AI models

- Infrastructure: Cloud-based, with redundancy and high availability

**System Requirements:**

- **Performance:** Sub-2-second response times for searches.

- **Security:** End-to-end encryption for messaging and sensitive data.

- **Scalability:** Handle 100,000+ users and millions of listings.

- **Reliability:** 99.9% uptime.

- **Integration Constraints:** Seamless API compatibility with existing university systems.

**4. User Experience**  
**Key User Flows:**

1. **TTO Listing Management:**

   - **Entry Point:** Log into the dashboard.

   - **Steps:** Add/edit details → Tag with keywords → Publish → View metrics.

   - **Success Criteria:** Listing is visible with match scores.

2. **Entrepreneur Matching:**

   - **Entry Point:** Complete a profile with interests.

   - **Steps:** Get recommendations → Browse → Save/watchlist → Initiate contact.

   - **Success Criteria:** Engage in licensing discussions with TTOs.

3. **Grant Recommendations:**

   - **Entry Point:** Dashboard with selected technology.

   - **Steps:** View relevant grants → Apply via templates → Set alerts.

   - **Success Criteria:** Submit at least one grant application.

4. **IP Management:**

   - **Entry Point:** Negotiation on a specific technology.

   - **Steps:** Share terms → Collaborate securely → Sign agreement.

   - **Success Criteria:** Documented licensing agreement is finalized.

**Core Interfaces:**

1. **TTO Dashboard:** Add/manage technologies and view analytics.

2. **Entrepreneur Dashboard:** Save technologies, view grants, and manage communications.

3. **Technology Search Interface:** Explore tech listings, filter results, and view matches.

4. **Grant Module:** Find opportunities, track progress, and use LLM for applications.

5. **Messaging Hub:** Secure communication and document sharing.

----------

**5. Business Requirements**  
**Access Control:**

- Role-based permissions for TTOs, entrepreneurs, and admins.

- Secure authentication and access management.

**Business Rules:**

- Verify data accuracy in listings.

- Ensure secure data storage and transfer.

- Meet compliance standards for IP handling.

**6. Implementation Priorities**  
**High Priority:**

- TTO and entrepreneur dashboards.

- Grant and technology matching features.

- Secure communication.

**Medium Priority:**

- Advanced search and filters.

- Grant reminders and tracking.

**Lower Priority:**

- Expanded collaboration tools.

- API documentation and white-labeling options.

University Scraper:

• university: Name of the university

• title: Title of the technology listing

• link: URL to the detailed technology page

• description: Detailed description of the technology, including application areas,

benefits, and other relevant information

Grant Scraper:

\-        Agency: Name of the agency awarding the grant

\-        Title: Title of the grant

\-        Link: URL to the grant

\-        Description: detailed description of the grant, including application areas, benefits, and other relevant information.

We want the platform to have it, so founders click here for the technology licensing, but they can’t work around us.

*To manage the 400 URLs for scraping, the application must include an **extensible configuration file** where URLs can be listed, updated, or removed as needed. This file will serve as the centralized repository for the scraper's input and must be dynamically read by the application during each biweekly refresh cycle. Users should populate this file with the 400 URLs post-deployment, ensuring the system is adaptable to changes without requiring code modifications.*

Example of patent scraper:

Web Scraper Implementation Guide

Andrew Medrano

November 20, 2024

Contents

1 Project Structure and Setup 2

1.1 Directory Structure . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 2

1.2 Environment Setup . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 2

1.2.1 Prerequisites . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 2

1.2.2 Setup Instructions . . . . . . . . . . . . . . . . . . . . . . . . . . 2

2 Contributing 3

2.1 Prerequisites . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 3

2.2 Development Workflow . . . . . . . . . . . . . . . . . . . . . . . . . . . . 3

3 Overview 4

4 Data Requirements 4

5 Base Class Structure 4

6 Key Components to Implement 4

6.1 Class Definition . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 4

6.2 Required Methods . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 5

6.2.1 get page soup . . . . . . . . . . . . . . . . . . . . . . . . . . . . 5

6.2.2 get items from page . . . . . . . . . . . . . . . . . . . . . . . . . 5

6.2.3 get item details . . . . . . . . . . . . . . . . . . . . . . . . . . 6

7 Adding New Scrapers 6

8 Running Scrapers 6

9 Best Practices and Tips 7

9.1 HTML Inspection . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 7

9.2 Rate Limiting . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 7

9.3 Error Handling and Logging . . . . . . . . . . . . . . . . . . . . . . . . . 7

9.4 Data Storage . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 7

9.5 BeautifulSoup Quick Reference . . . . . . . . . . . . . . . . . . . . . . . 7

9.6 Final Checklist . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 8

10 Git Workflow and Pull Requests 8

10.1 Branching Strategy . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 8

10.2 Pull Request Process . . . . . . . . . . . . . . . . . . . . . . . . . . . . . 9

1

1 Project Structure and Setup

1.1 Directory Structure

The project follows this directory structure for organization and consistency:

Incepta_backend/

|-- README.md # Project overview and setup instructions

|-- requirements.txt # Python package dependencies

|-- main/

| |-- scrapers/ # All web scrapers go here

| | |-- base_scraper.py

| | |-- your_scraper.py

| |-- static/

| | |-- images/ # Static assets

| |-- templates/ # Web interface templates

| |-- embeddings_generator.py

| |-- semantic_search_app.py

| |-- semantic_llm_search.py

|-- data/

|-- tech/ # Scraped technology data goes here

|-- stanford_2024_11_20.csv

|-- grants/

|-- grants_sbir_2024_11_20.csv

1.2 Environment Setup

1.2.1 Prerequisites

• Python 3.8 or higher

• pip (Python package installer)

• Git

1.2.2 Setup Instructions

1\. Create and activate a virtual environment:

1 # On Windows

2 python -m venv venv

3 .\\ venv \\ Scripts \\ activate

4

5 # On macOS / Linux

6 python3 -m venv venv

7 source venv /bin / activate

2\. Install required packages:

1 pip install -r requirements .txt

2

2 Contributing

2.1 Prerequisites

1\. Create a GitHub account if you don’t have one.

2\. Fork the repository by clicking the “Fork” button at https://github.com/andrew-medrano/

Incepta_backend.

3\. Clone your fork (not the original repository):

1 git clone

,→ https :// github .com/YOUR - USERNAME / Incepta_backend .git

2 cd Incepta_backend

4\. Add the original repository as a remote named upstream:

1 git remote add upstream

,→ https :// github .com/andrew - medrano / Incepta_backend .git

2.2 Development Workflow

1\. Keep your fork up to date:

1 git checkout develop

2 git fetch upstream

3 git merge upstream / develop

4 git push origin develop

2\. Create your feature branch:

1 git checkout -b feature /your - university - scraper

3\. Make your changes and commit them:

1 git add .

2 git commit -m " feat : Add scraper for University Name "

4\. Push to your fork:

1 git push origin feature /your - university - scraper

5\. Create a Pull Request:

• Go to https://github.com/andrew-medrano/Incepta_backend.

• Click “New Pull Request”.

• Click “compare across forks”.

• Select your fork and branch.

• Fill in the PR template with required information.

3

3 Overview

This guide explains how to create new web scrapers that inherit from the updated

BaseScraper class. The goal is to collect technology listings from university technology

transfer offices and compile them into a structured dataset.

4 Data Requirements

The data collected by the scraper should be assembled into a DataFrame with the following

columns:

• university: Name of the university

• title: Title of the technology listing

• link: URL to the detailed technology page

• description: Detailed description of the technology, including application areas,

benefits, and other relevant information

5 Base Class Structure

The BaseScraper class provides a robust foundation for implementing website-specific

scrapers. It includes:

• Session management with customizable headers

• Abstract methods that must be implemented in subclasses

• Flexible data field configuration

• Error handling and logging

• Optional retry logic for network requests

• Data collection and assembly into a DataFrame

6 Key Components to Implement

6.1 Class Definition

Your scraper should inherit from BaseScraper and initialize with the target website’s

URL, university name, and required data fields.

1 from base_scraper import BaseScraper

2 from bs4 import BeautifulSoup

3 from typing import List , Dict

4 import time

5 import logging

6

7 class YourWebsiteScraper ( BaseScraper ):

8 def \__init_\_ ( self ):

4

9 fieldnames = \[" university ", " title ", " link ",

,→ " description "\]

10 super (). \__init_\_ (

11 base_url =" https :// your - website -url.com/",

12 fieldnames = fieldnames ,

13 headers ={

14 ’User - Agent ’: ’ YourScraperName /1.0

,→ ( contact@example .com)’

15 }

16 )

17 self . university = " Your University Name "

6.2 Required Methods

6.2.1 get page soup

1 @retry ( stop = stop_after_attempt (3) , wait = wait_fixed (2) )

2 def get_page_soup (self , page_number : int) -\> BeautifulSoup :

3 url = f"{ self . base_url }/ listings ? page ={ page_number }"

4 response = self . session .get(url)

5 response . raise_for_status ()

6 soup = BeautifulSoup ( response .text , ’html . parser ’)

7 time . sleep (1)

8 return soup

6.2.2 get items from page

1 def get_items_from_page (self , soup : BeautifulSoup ) -\>

,→ List \[ Dict \[str , str \]\]:

2 """

3 Extract items from a page .

4

5 Args :

6 soup ( BeautifulSoup ): Parsed HTML content of a page .

7

8 Returns :

9 List \[ Dict \[str , str \]\]: List of items with their titles

,→ and links .

10 """

11 items = \[\]

12 listings = soup . find_all (’div ’, class\_ =’listing - item ’)

13

14 for listing in listings :

15 title_element = listing . find (’h3 ’, class\_ =’title ’)

16 link_element = listing . find (’a’, class\_ =’details - link ’)

17

18 if title_element and link_element :

19 title = title_element . get_text ( strip = True )

20 link = self . make_absolute_url ( link_element \[’href ’\])

21 items . append ({

22 ’university ’: self . university ,

23 ’title ’: title ,

5

24 ’link ’: link

25 })

26 else :

27 logging . warning (f" Missing title or link in listing :

,→ { listing }")

28

29 return items

6.2.3 get item details

1 def get_item_details (self , link : str) -\> Dict \[str , str \]:

2 """

3 Get detailed information for a single item .

4

5 Args :

6 link (str ): URL of the item ’s page .

7

8 Returns :

9 Dict \[str , str \]: Dictionary containing item details .

10 """

11 response = self . session .get( link )

12 response . raise_for_status ()

13 soup = BeautifulSoup ( response .text , ’html . parser ’)

14 time . sleep (0.5)

15

16 description_element = soup . find (’div ’, class\_ =’ description ’)

17 description = description_element . get_text ( strip = True ) if

,→ description_element else ’’

18 description = self . clean_text ( description )

19

20 return {’description ’: description }

7 Adding New Scrapers

When adding a new scraper:

1\. Create a new file in main/scrapers/ with your scraper class.

2\. Follow the naming convention: university name scraper.py.

3\. Ensure scraped data is saved to data/tech/.

4\. Update requirements.txt if new dependencies are needed.

8 Running Scrapers

1\. Ensure you’re in the project root directory.

2\. Activate the virtual environment.

3\. Run your scraper:

6

1 python -m main . scrapers . your_scraper \\

2 -- output data / tech / university_name\_$ ( date +% Y\_%m\_%d).csv

9 Best Practices and Tips

9.1 HTML Inspection

1\. Use browser developer tools (F12) to inspect website HTML.

2\. Look for unique class names or IDs.

3\. Test selectors in the browser console first.

9.2 Rate Limiting

1\. Include time.sleep() delays between requests.

2\. Start with conservative delays (e.g., 1 second).

3\. Check the website’s robots.txt for guidance.

9.3 Error Handling and Logging

1\. Use try/except blocks for critical sections.

2\. Use response.raise for status() to handle HTTP errors.

3\. Provide fallback values when data extraction fails.

4\. Use the logging module for appropriate severity levels.

9.4 Data Storage

• All scraped data should be saved in the data/tech/ directory.

• Use consistent naming: university name YYYY MM DD.csv.

• Include metadata in the CSV header when possible.

• Ensure proper encoding (UTF-8) for all saved files.

9.5 BeautifulSoup Quick Reference

Documentation: https://www.crummy.com/software/BeautifulSoup/bs4/doc/

Common selectors:

1 soup . find (’tag_name ’, class\_ =’class_name ’)

2 soup . find_all (’tag_name ’, class\_ =’class_name ’)

3 element . get_text ( strip = True )

4 element \[’ attribute_name ’\]

5 element . find_next (’tag_name ’)

6 element . find_parent (’tag_name ’)

7

9.6 Final Checklist

1\. Included university Field.

2\. Verified Data Fields.

3\. Ensured Proper Error Handling.

4\. Tested Scraper with Multiple Pages.

5\. Output Data Matches Specified Format.

6\. Complied with Ethical Scraping Practices.

7\. Handled Missing Data.

8\. Used Absolute URLs.

9\. Set Custom Headers.

10\. Validated Data.

11\. Documented Code.

10 Git Workflow and Pull Requests

10.1 Branching Strategy

• Main Branches:

– main: Production-ready code.

– develop: Integration branch for features.

• Feature Branches:

– Name format: feature/university-name-scraper.

– Branch from: develop.

– Merge to: develop.

• Hotfix Branches:

– Name format: hotfix/brief-description.

– Branch from: main.

– Merge to: both main and develop.

8

10.2 Pull Request Process

1\. Create a new branch:

1 git checkout develop

2 git pull origin develop

3 git checkout -b feature /your - university - scraper

2\. Commit your changes:

1 git add .

2 git commit -m " feat : Add scraper for University Name "

3\. Push and create PR:

1 git push origin feature /your - university - scraper

4\. PR Requirements:

• Title follows format: “feat: Add scraper for University Name”.

• Description includes:

– Brief overview of changes.

– Testing methodology.

– Sample of scraped data.

• All tests passing.

• Code follows style guide.

• Documentation updated.

5\. Review Process:

• At least one approval required.

• All comments addressed.

9
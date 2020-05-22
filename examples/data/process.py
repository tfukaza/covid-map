import csv 
import json

covid = open('data/us-counties.csv')
info = open('data/county-info.csv')

# create a map that maps county name to long/latitude
info_reader = csv.reader(info) 
covid_reader = csv.reader(covid) 
info_map = {}


state_code_mapping = {
'Alaska'                : 'AK',
'Alabama'               : 'AL',
'Arkansas'              : 'AR',
'Arizona'               : 'AZ',
'California'            : 'CA',
'Colorado'              : 'CO',
'Connecticut'           : 'CT',
'Washington DC'         : 'DC',
'Delaware'              : 'DE',
'Florida'               : 'FL',
'Georgia'               : 'GA',
#'Guam'                  : 'GU',
'Hawaii'                : 'HI',
'Iowa'                  : 'IA',
'Idaho'                 : 'ID',
'Illinois'              : 'IL',
'Indiana'               : 'IN',
'Kansas'                : 'KS',
'Kentucky'              : 'KY',
'Louisiana'             : 'LA',
'Massachusetts'         : 'MA',
'Maryland'              : 'MD',
'Maine'                 : 'ME',
'Michigan'              : 'MI',
'Minnesota'             : 'MN',
'Missouri'              : 'MO',
'Mississippi'           : 'MS',
'Montana'               : 'MT',
'North Carolina'        : 'NC',
'North Dakota'          : 'ND',
'Nebraska'              : 'NE',
'New Hampshire'         : 'NH',
'New Jersey'            : 'NJ',
'New Mexico'            : 'NM',
'Nevada'                : 'NV',
'New York'              : 'NY',
'Ohio'                  : 'OH',
'Oklahoma'              : 'OK',
'Oregon'                : 'OR',
'Pennsylvania'          : 'PA',
'Puerto Rico'           : 'PR',
'Rhode Island'          : 'RI',
'South Carolina'        : 'SC',
'South Dakota'          : 'SD',
'Tennessee'             : 'TN',
'Texas'                 : 'TX',
'Utah'                  : 'UT',
'Virginia'              : 'VA',
'Virgin Islands'        : 'VI',
'Vermont'               : 'VT',
'Washington'            : 'WA',
'Wisconsin'             : 'WI',
'West Virginia'         : 'WV',
'Wyoming'               : 'WY'
}
    

# Zip,City,State,Latitude,Longitude,Timezone,Daylight savings time flag,geopoint
# 71937,Cove,AR,34.398483,-94.39398,-6,1,"34.398483,-94.39398"
next(info_reader) # skip the first line

# parse through entries
for row in info_reader:
    state = row[2]
    county = row[1]
    lat = row[3]
    lng = row[4]

    if state in info_map:
        info_map[state][county] = [lng, lat]

    else:
        info_map[state] = {}
        info_map[state][county] = [lng, lat]

#print(info_map)

# create a JSON to store infection data
#date,county,state,fips,cases,deaths
#2020-01-21,Snohomish,Washington,53061,1,0

#JSON data = {'CA': [ {'name': county, 'date': date, 'cases': cases, 'death': death}  ]  }

# create a map to keep track of which county we have parsed
county_bag = {}
data = {}

# parse through entries, from latest to oldest
for row in reversed(list(covid_reader)):

    date = row[0]
    county = row[1]

    state  = ''
    if row[2] in state_code_mapping:
        state = state_code_mapping[row[2]] # convert to state code
    else:
        continue

    cases=row[4]
    death=row[5]

    # if this state is in our bag, see if the bag has the county
    if state in county_bag:

        # if so, skip, since we already have data
        if county in county_bag[state]:
            continue
        # else collect data
        else:
            county_bag[state][county] = True
    
    else:
        data[state] = []
        county_bag[state] = {}
        county_bag[state][county] = True

    # continue processing... 
    # check if the county is in our map 
    if not county in info_map[state]:
        continue

    (lng, lat) = info_map[state][county]

    data[state].append({'state': state, 'name': county, 'date': date, 'cases':cases, 'death':death, 'long': lng, 'lat': lat})


j = open('data/data.json', 'w')
json.dump(data, j)

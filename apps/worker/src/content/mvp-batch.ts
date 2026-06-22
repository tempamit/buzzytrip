import { initialDestinationCatalog } from '@buzzytrip/database';

import type { ResearchSourceDefinition } from '../research/types';

export interface MvpGuideProfile {
  audiences: string[];
  contentAngle: string;
  destinationSlug: string;
  guideSlug: string;
  imageQuery: string;
  officialSources: ResearchSourceDefinition[];
  primaryKeyword: string;
  tripTheme: string;
  wikimediaTitle: string;
}

export const initialMvpGuideProfiles: MvpGuideProfile[] = [
  {
    audiences: ['first-time visitors', 'couples', 'families'],
    contentAngle: 'A well-paced three-day lake, old-city, and heritage plan',
    destinationSlug: 'udaipur',
    guideSlug: 'udaipur-first-trip-guide',
    imageQuery: 'Udaipur Rajasthan lakes palace travel',
    officialSources: [
      {
        publisher: 'Rajasthan Tourism',
        sourceType: 'official',
        title: 'Udaipur visitor information',
        url: 'https://www.tourism.rajasthan.gov.in/udaipur.html',
      },
    ],
    primaryKeyword: 'Udaipur travel guide',
    tripTheme: 'heritage and lakes',
    wikimediaTitle: 'Udaipur',
  },
  {
    audiences: ['friends', 'couples', 'families'],
    contentAngle: 'Choosing the right coast, pace, and base for a first Goa break',
    destinationSlug: 'goa',
    guideSlug: 'goa-first-trip-guide',
    imageQuery: 'Goa India coast beach travel',
    officialSources: [
      {
        publisher: 'Goa Tourism',
        sourceType: 'official',
        title: 'Official Goa visitor information',
        url: 'https://goa-tourism.com/',
      },
    ],
    primaryKeyword: 'Goa travel guide',
    tripTheme: 'coast and culture',
    wikimediaTitle: 'Goa',
  },
  {
    audiences: ['couples', 'families', 'older travellers'],
    contentAngle: 'A calm hill-country plan with tea landscapes and shorter travel days',
    destinationSlug: 'munnar',
    guideSlug: 'munnar-first-trip-guide',
    imageQuery: 'Munnar Kerala tea hills travel',
    officialSources: [
      {
        publisher: 'Kerala Tourism',
        sourceType: 'official',
        title: 'Munnar destination information',
        url: 'https://www.keralatourism.org/destination/munnar/202/',
      },
    ],
    primaryKeyword: 'Munnar travel guide',
    tripTheme: 'tea country and nature',
    wikimediaTitle: 'Munnar',
  },
  {
    audiences: ['first-time visitors', 'culture travellers', 'older travellers'],
    contentAngle: 'A respectful first visit built around the riverfront and old city',
    destinationSlug: 'varanasi',
    guideSlug: 'varanasi-first-trip-guide',
    imageQuery: 'Varanasi India ghats Ganges travel',
    officialSources: [
      {
        publisher: 'Uttar Pradesh Tourism',
        sourceType: 'official',
        title: 'Varanasi destination information',
        url: 'https://www.uptourism.gov.in/en/page/varanasi',
      },
    ],
    primaryKeyword: 'Varanasi travel guide',
    tripTheme: 'living heritage and riverfront',
    wikimediaTitle: 'Varanasi',
  },
  {
    audiences: ['solo travellers', 'friends', 'wellness travellers'],
    contentAngle: 'Balancing riverside calm, yoga, and accessible outdoor activities',
    destinationSlug: 'rishikesh',
    guideSlug: 'rishikesh-first-trip-guide',
    imageQuery: 'Rishikesh India Ganges bridge travel',
    officialSources: [
      {
        publisher: 'Uttarakhand Tourism',
        sourceType: 'official',
        title: 'Rishikesh destination information',
        url: 'https://uttarakhandtourism.gov.in/destination/rishikesh',
      },
    ],
    primaryKeyword: 'Rishikesh travel guide',
    tripTheme: 'wellness and soft adventure',
    wikimediaTitle: 'Rishikesh',
  },
  {
    audiences: ['first-time visitors', 'families', 'culture travellers'],
    contentAngle: 'A practical three-day plan for forts, bazaars, and manageable travel times',
    destinationSlug: 'jaipur',
    guideSlug: 'jaipur-first-trip-guide',
    imageQuery: 'Jaipur Rajasthan forts city travel',
    officialSources: [
      {
        publisher: 'Rajasthan Tourism',
        sourceType: 'official',
        title: 'Jaipur visitor information',
        url: 'https://www.tourism.rajasthan.gov.in/jaipur.html',
      },
    ],
    primaryKeyword: 'Jaipur travel guide',
    tripTheme: 'forts, markets, and heritage',
    wikimediaTitle: 'Jaipur',
  },
  {
    audiences: ['first-time visitors', 'solo travellers', 'families'],
    contentAngle: 'A neighbourhood-led first visit with clear rail and walking choices',
    destinationSlug: 'tokyo',
    guideSlug: 'tokyo-first-trip-guide',
    imageQuery: 'Tokyo Japan city neighbourhood travel',
    officialSources: [
      {
        publisher: 'Tokyo Convention & Visitors Bureau',
        sourceType: 'official',
        title: 'GO TOKYO visitor information',
        url: 'https://www.gotokyo.org/en/',
      },
    ],
    primaryKeyword: 'Tokyo travel guide',
    tripTheme: 'neighbourhoods and city discovery',
    wikimediaTitle: 'Tokyo',
  },
  {
    audiences: ['families', 'couples', 'first-time visitors'],
    contentAngle: 'Planning a comfortable city break without assuming a luxury budget',
    destinationSlug: 'dubai',
    guideSlug: 'dubai-first-trip-guide',
    imageQuery: 'Dubai UAE skyline old city travel',
    officialSources: [
      {
        publisher: 'Dubai Department of Economy and Tourism',
        sourceType: 'official',
        title: 'Visit Dubai visitor information',
        url: 'https://www.visitdubai.com/en/',
      },
    ],
    primaryKeyword: 'Dubai travel guide',
    tripTheme: 'modern city and local culture',
    wikimediaTitle: 'Dubai',
  },
  {
    audiences: ['couples', 'culture travellers', 'first-time visitors'],
    contentAngle: 'A first Paris visit organised by neighbourhood and realistic daily pace',
    destinationSlug: 'paris',
    guideSlug: 'paris-first-trip-guide',
    imageQuery: 'Paris France neighbourhood street travel',
    officialSources: [
      {
        publisher: 'Paris je t’aime Tourist Office',
        sourceType: 'official',
        title: 'Official Paris visitor information',
        url: 'https://parisjetaime.com/eng/',
      },
    ],
    primaryKeyword: 'Paris travel guide',
    tripTheme: 'neighbourhoods, art, and food',
    wikimediaTitle: 'Paris',
  },
  {
    audiences: ['families', 'solo travellers', 'older travellers'],
    contentAngle: 'A low-friction city break using public transport and compact daily routes',
    destinationSlug: 'singapore',
    guideSlug: 'singapore-first-trip-guide',
    imageQuery: 'Singapore skyline neighbourhood travel',
    officialSources: [
      {
        publisher: 'Singapore Tourism Board',
        sourceType: 'official',
        title: 'Visit Singapore visitor information',
        url: 'https://www.visitsingapore.com/',
      },
    ],
    primaryKeyword: 'Singapore travel guide',
    tripTheme: 'food, neighbourhoods, and easy transit',
    wikimediaTitle: 'Singapore',
  },
  {
    audiences: ['couples', 'families', 'first-time visitors'],
    contentAngle: 'A harbour-centred first visit with coast, city, and short excursions',
    destinationSlug: 'sydney',
    guideSlug: 'sydney-first-trip-guide',
    imageQuery: 'Sydney Australia harbour coast travel',
    officialSources: [
      {
        publisher: 'Destination NSW',
        sourceType: 'official',
        title: 'Sydney visitor information',
        url: 'https://www.sydney.com/',
      },
    ],
    primaryKeyword: 'Sydney travel guide',
    tripTheme: 'harbour, coast, and city life',
    wikimediaTitle: 'Sydney',
  },
  {
    audiences: ['couples', 'solo travellers', 'older travellers'],
    contentAngle: 'A walkable first visit shaped around canals, museums, and quieter districts',
    destinationSlug: 'amsterdam',
    guideSlug: 'amsterdam-first-trip-guide',
    imageQuery: 'Amsterdam Netherlands canals neighbourhood travel',
    officialSources: [
      {
        publisher: 'Amsterdam & Partners',
        sourceType: 'official',
        title: 'I amsterdam visitor information',
        url: 'https://www.iamsterdam.com/en',
      },
    ],
    primaryKeyword: 'Amsterdam travel guide',
    tripTheme: 'canals, museums, and neighbourhoods',
    wikimediaTitle: 'Amsterdam',
  },
];

export function findMvpGuideProfile(destinationSlug: string): MvpGuideProfile | null {
  return (
    initialMvpGuideProfiles.find((profile) => profile.destinationSlug === destinationSlug) ?? null
  );
}

export function validateMvpGuideProfiles(): void {
  const catalogSlugs = new Set(initialDestinationCatalog.map((destination) => destination.slug));
  const destinationSlugs = new Set<string>();
  const guideSlugs = new Set<string>();

  for (const profile of initialMvpGuideProfiles) {
    if (!catalogSlugs.has(profile.destinationSlug)) {
      throw new Error(`MVP destination is absent from the catalogue: ${profile.destinationSlug}`);
    }
    if (destinationSlugs.has(profile.destinationSlug) || guideSlugs.has(profile.guideSlug)) {
      throw new Error(`MVP guide profile is duplicated: ${profile.destinationSlug}`);
    }
    if (profile.officialSources.length === 0) {
      throw new Error(`MVP guide has no official source: ${profile.destinationSlug}`);
    }
    destinationSlugs.add(profile.destinationSlug);
    guideSlugs.add(profile.guideSlug);
  }
}

validateMvpGuideProfiles();

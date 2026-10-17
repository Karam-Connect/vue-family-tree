import type { FamilyNode } from './types'

const photo = (seed: string) => `https://picsum.photos/seed/${ seed }/300`

/**
 * The demo family. Each branch shows off a feature: dates and the deceased symbol, hidden people, relationship
 * marks and dates, several partners, and a custom field (`hometown`) that the custom cards display.
 */
export const demoFamily = (showHidden: boolean): FamilyNode[] => [ {
    firstPerson: {
        id: 'haroun',
        name: 'Haroun Al-Masri',
        image: photo('haroun'),
        gender: 'male',
        born: 1924,
        died: 1991
    },
    secondPerson: { id: 'mariam', name: 'Mariam Haddad', image: photo('mariam'), gender: 'female', born: '1927-05-11' },
    children: [
        {
            firstPerson: { id: 'nadia', name: 'Nadia', gender: 'female', born: 1949 },
            // Uncertain dates are shown as written
            secondPerson: { id: 'tomas', name: 'Tomás Ortega', gender: 'male', born: 'c. 1946', died: '?' },
            children: [
                {
                    firstPerson: { id: 'daniel', name: 'Daniel', deceased: true },
                    secondPerson: { id: 'leila', name: 'Leila' },
                    children: [
                        {
                            firstPerson: { id: 'adam', name: 'Adam', hometown: 'Amman' },
                            secondPerson: { id: 'zoe', name: 'Zoe', hometown: 'Lyon' }
                        },
                        // A hidden node takes its descendants with it
                        { hidden: !showHidden, firstPerson: { id: 'ilyas', name: 'Ilyas' } }
                    ]
                },
                {
                    firstPerson: { id: 'rania', name: 'Rania' },
                    // A hidden partner leaves Rania on her own
                    secondPerson: { id: 'karim', name: 'Karim', hidden: !showHidden }
                }
            ]
        },
        {
            // Status and dates show on the line between the two
            firstPerson: { id: 'fadi', name: 'Fadi' },
            secondPerson: { id: 'hana', name: 'Hana' },
            relationship: 'separated',
            start: 1972,
            end: 2001,
            children: [ {
                firstPerson: { id: 'jonah', name: 'Jonah' },
                secondPerson: { id: 'mei', name: 'Mei', hometown: 'Taipei' },
                relationship: 'partners',
                start: 2016
            } ]
        },
        {
            // Several partners: the first through secondPerson / children, the rest in `partners`
            firstPerson: { id: 'yusuf', name: 'Yusuf', gender: 'male', born: 1955 },
            secondPerson: { id: 'amira', name: 'Amira', gender: 'female', born: 1958 },
            start: 1980,
            children: [ { firstPerson: { id: 'omar', name: 'Omar' } }, { firstPerson: { id: 'huda', name: 'Huda' } } ],
            partners: [
                {
                    person: { id: 'layla', name: 'Layla', gender: 'female', born: 1962 },
                    start: 1986,
                    children: [ { firstPerson: { id: 'samir', name: 'Samir' } } ]
                },
                {
                    person: { id: 'sara', name: 'Sara', gender: 'female' },
                    relationship: 'divorced',
                    start: 1990,
                    end: 1996,
                    children: [ { firstPerson: { id: 'rami', name: 'Rami' } }, {
                        firstPerson: {
                            id: 'nour',
                            name: 'Nour'
                        }
                    } ]
                }
            ]
        },
        {
            firstPerson: {
                id: 'elias',
                name: 'Elias Al-Masri',
                image: photo('elias'),
                gender: 'male',
                born: 1951,
                died: '2021-02-09'
            },
            secondPerson: { id: 'grace', name: 'Grace Mensah', gender: 'female', born: 1953, hometown: 'Accra' },
            children: [
                {
                    firstPerson: { id: 'ama', name: 'Ama Al-Masri', gender: 'female', born: 1977 },
                    children: [ { firstPerson: { id: 'kofi', name: 'Kofi' } }, {
                        firstPerson: {
                            id: 'esi',
                            name: 'Esi'
                        }
                    } ]
                },
                // Gender picks the deceased symbol: anything but male / female gets a diamond
                { firstPerson: { id: 'tunde', name: 'Tunde Al-Masri', gender: 'nonbinary', born: 1980, died: 2018 } },
                { firstPerson: { id: 'chidi', name: 'Chidi Al-Masri' } }
            ]
        }
    ]
} ]

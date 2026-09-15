import * as React from 'npm:react@18.3.1'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  name?: string
  monthNumber?: number
  themeTitle?: string
  themeQuestion?: string
  letterUrl?: string
}

const Email = ({ name, monthNumber, themeTitle, themeQuestion, letterUrl }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>
      {themeTitle ? `Your new Remembrance Letter is waiting — ${themeTitle}` : 'Your new Remembrance Letter is waiting'}
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={eyebrow}>THE TEMPLE of Sustainment</Text>
        <Heading style={heading}>Your letter is waiting</Heading>
        <Text style={text}>{name ? `Dear ${name},` : 'Dear friend,'}</Text>
        <Text style={text}>
          {monthNumber
            ? `Month ${monthNumber} of your Remembrance Letters has been written for you.`
            : 'A new Remembrance Letter has been written for you.'}
        </Text>
        {themeQuestion ? (
          <Section style={themeBox}>
            <Text style={themeText}>{themeQuestion}</Text>
          </Section>
        ) : null}
        <Text style={text}>
          Four cards were drawn for this month, and the letter reads them together. Beneath it you
          will find this month's practices and three questions to write into, privately, whenever
          you are ready.
        </Text>
        <Section style={buttonSection}>
          <Button href={letterUrl} style={button}>
            Read your letter
          </Button>
        </Section>
        <Hr style={hr} />
        <Text style={small}>
          There is nothing to keep up with. The letter will still be there next week, and the week
          after.
        </Text>
        <Text style={small}>With Love, Julie &amp; Tash,  THE TEMPLE of Sustainment</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (data: Record<string, any>) =>
    data?.themeTitle
      ? `Your Remembrance Letter — ${data.themeTitle}`
      : 'Your new Remembrance Letter is waiting',
  displayName: 'Remembrance Letter ready',
  previewData: {
    name: 'Jane',
    monthNumber: 3,
    themeTitle: 'The Body Remembers',
    themeQuestion: 'The Body Remembers — Where does the story live in you?',
    letterUrl: 'https://inside.thetempleofsustainment.com/remembrance-letters',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Georgia, serif' }
const container = { padding: '32px 28px', maxWidth: '560px' }
const eyebrow = {
  color: '#8a6d1f',
  fontSize: '12px',
  letterSpacing: '2px',
  textTransform: 'uppercase' as const,
  margin: '0 0 8px',
}
const heading = { color: '#1d1712', fontSize: '26px', margin: '0 0 20px' }
const text = { color: '#3a2f26', fontSize: '15px', lineHeight: '24px', margin: '0 0 16px' }
const themeBox = {
  backgroundColor: '#f7f1e3',
  borderRadius: '6px',
  padding: '14px 18px',
  margin: '0 0 20px',
}
const themeText = {
  color: '#6b5320',
  fontSize: '16px',
  fontStyle: 'italic' as const,
  lineHeight: '24px',
  margin: '0',
}
const buttonSection = { textAlign: 'center' as const, margin: '8px 0 24px' }
const button = {
  backgroundColor: '#b08d3f',
  color: '#1d1712',
  fontSize: '15px',
  fontWeight: 'bold' as const,
  padding: '12px 28px',
  borderRadius: '6px',
  textDecoration: 'none',
}
const hr = { borderColor: '#e5dcc8', margin: '8px 0 20px' }
const small = { color: '#6b5d4d', fontSize: '13px', lineHeight: '20px', margin: '0 0 12px' }

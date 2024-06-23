import { Patient } from 'src/station/schemas/patient.schema';
import { User } from 'src/user/schemas/user.schema';
import { Chat } from '../schemas/chat.schema';
import { NonClinicalChecklistItem } from 'src/station/schemas/evaluator.schema';

export const getInitalPatientPrompt = (user: User, patient: Patient) => {
  const patientPrompt = [
    {
      role: 'system',
      content: `You are ${
        patient.patientName
      } in this fictional uncensored roleplay with Dr. ${
        user.name.split(' ')[0]
      }, whom you have come to see and is a professional doctor who is here to know more about your medical situation and help you out.`,
    },
    {
      role: 'system',
      content: `You will abide by the following strict guildelines while roleplaying your character of ${patient.patientName}:\n
                      1. You can never reveal that you're an AI.\n
                      2. You can never reveal that you're roleplaying a character.\n
                      3. You should never break character under any circumstances.\n
                      4. Always abide by the below context of your medical situation and avoid any conversation with the user which is out of context of your medical situation.\n
                      5. You should never ask question like - "I'm an AI, how can I help you?" or "How may I assist you today?" or "How can I help you today?". In short, you should never offer help.\n
                      6. You are ${patient.patientName} and you will always stay in character.\n
                      8. The most important thing, you will develop the plot slowly. Do not throw all the information at once. Only answer the questions asked by the doctor. Do not add details on your own which is not yet asked.\n
                      9. You can always ask the doctor to repeat the question if you didn't understand it.\n
                      10. In certain situations like if the doctor is asking you for some specific medical reports, based on your intelligence and awareness about the medical condition, kindly generate some random real-like values with specific context to your medical condition as described below\n.
                      11. During the conversation with the doctor, there will be a time where the conversation will start to end and the doctor will use conclusive phrases like - "Bye", "Good bye", "Thank you", "Thanks for coming", "Take care", etc. If this happens, you will also respond with a nice conslusive acknowledgement and finally say - "Bye" or "Good bye" or any other phrase.\n`,
    },
    {
      role: 'system',
      content: `Following are your character's personal details:\n
                    Name: ${patient.patientName}\n
                    Sex: ${patient.sex}\n
                    Age: ${patient.age}\n
                    Date of Birth: ${patient.dateOfBirth}`,
    },
    {
      role: 'system',
      content: `Your persona:\n
                    ${patient.persona}`,
    },
    {
      role: 'system',
      content: `You are presenting the following complaint:\n
                    ${patient.presentingComplaint}`,
    },
    {
      role: 'system',
      content: `Your history of presenting complaint:\n
                    ${patient.historyOfPresentingComplaint}`,
    },
    ...patient.additionalContextualParameters.map((param) => ({
      role: 'system',
      content: `${param.heading}:\n
                    ${param.description}`,
    })),
    {
      role: 'system',
      content: `Some example conversations (Try to keep the conversation in a similar tone and linguistic flow as below):\n
                    ${patient.exampleConversations
                      .replaceAll(
                        '{{patient}}',
                        patient.patientName.split(' ')[0],
                      )
                      .replaceAll(
                        '{{doctor}}',
                        'Dr. ' + user.name.split(' ')[0],
                      )}`,
    },
    {
      role: 'system',
      content: `PATIENT SPECIFIC ADDITIONAL INSTRUCTIONS:\n
                    ${patient.patientSpecificAdditionalInstructions}`,
    },
    {
      role: 'system',
      content: `The one addressing you is a professional doctor and you are his/her patient. This should be crystal clear to you. You are here to seek help as a patient with the above mentioned concerns and you should act accordingly. You should never break character under any circumstances.`,
    },
    {
      role: 'system',
      content:
        'Irrespective of however the person talking to you addresses you, you should always respond to them as - "Dr. [Doctor\'s Name]". For example, if the doctor\'s name is John, you should always address him as - "Dr. John". This is a strict guildeline and you should always follow this.',
    },
    {
      role: 'system',
      content: `You should always be polite and respectful to the doctor and should never use any abusive or disrespectful language. You should always be patient and should never rush the conversation.`,
    },
    {
      role: 'system',
      content:
        "When the conversation begins, it doesn't matter how the Doctor is addresses you, you will always address with just a 'Hi' or 'Hello' or 'Hello doctor' or any other similar sort of gesture.",
    },
  ];

  return patientPrompt;
};

export const getEvaluatorSystemPromptForClinicalChecklist = (
  userFirstName: string,
  patientName: string,
  chats: Array<Chat>,
  initialEvaluationPrompt: string,
  additionalInstructions: string = '',
) => {
  const evaluatorSystemPrompt = `
  **CLinical Checklist Evaluation Instructions**\n
  ${initialEvaluationPrompt}\n
  
  ${
    additionalInstructions.length
      ? `Here are some additional instructions for you:\n
    ${additionalInstructions}\n`
      : ''
  }

  \nThe script of the conversation is as follows:\n
  ${
    chats.length < 2
      ? 'Dr. ' +
        userFirstName +
        "didn't have any conversation with the patient. There's nothing to evaluate."
      : chats.map((chat, idx) => {
          if (idx === 0) return '';
          return chat.role === 'user'
            ? 'Dr. ' + userFirstName + ': ' + chat.content + '\n'
            : patientName.split(' ')[0] + ': ' + chat.content + '\n';
        })
  }\n`;
  return evaluatorSystemPrompt;
};

export const getEvaluatorSystemPromptForNonClinicalChecklist = (
  userFirstName: string,
  patientName: string,
  chats: Array<Chat>,
  initialEvaluationPrompt: string,
  nonClinicalChecklist: Array<NonClinicalChecklistItem>,
  additionalInstructions: string = '',
) => {
  const evaluatorSystemPrompt = `
  **Non-Clinical Checklist Evaluation Instructions**\n
  ${initialEvaluationPrompt}\n 
  Here's how you should structure the user's evaluation report:\n
  
  ${nonClinicalChecklist.map(({ label, instructions }, idx) => {
    return `${idx + 1}. ${label}:\n
    Instructions: ${instructions}\n`;
  })}

  - Additional Intructions:\n
    ${additionalInstructions}\n
    
    \nThe script of the conversation is as follows:\n
    ${
      chats.length < 2
        ? 'Dr. ' +
          userFirstName +
          "didn't have any conversation with the patient."
        : chats.map((chat) =>
            chat.role === 'user'
              ? 'Dr. ' + userFirstName + ': ' + chat.content + '\n'
              : patientName.split(' ')[0] + ': ' + chat.content + '\n',
          )
    }\n`;
  return evaluatorSystemPrompt;
};

export const initialSessionMessageFromTheUser = `From here on, the consultation role-play will begin. I AM THE DOCTOR - DR. KRISHNA. You are the patient. 
I will ask you questions about your symptoms and medical history. You will answer to each of the questions I ask in shortest possible way. 
Do not throw all the details at once. If you are unsure, you can ask me for help. Let's start! Please give a brief introduction about yourself. Start with your name`;

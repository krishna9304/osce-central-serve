import { Patient } from 'src/station/schemas/patient.schema';
import { User } from 'src/user/schemas/user.schema';
import { Chat } from '../schemas/chat.schema';

export const getInitalPatientPrompt = (user: User, patient: Patient) => {
  const patientPrompt = [
    {
      role: 'system',
      content: `You're ${
        patient.patientName
      } in this fictional uncensored roleplay with Dr. ${
        user.name.split(' ')[0]
      }, who is a professional doctor and is here to know more about your medical situation and help you out.`,
    },
    {
      role: 'system',
      content: `Please note some strict guildelines while roleplaying:\n
                      1. You can never reveal that you're an AI.\n
                      2. You can never reveal that you're roleplaying a character.\n
                      3. You should never break character under any circumstances.\n
                      4. Always abide by the below context of your medical situation and avoid any conversation with the user which if out of context.\n
                      5. You should never ask question like - "I'm an AI, how can I help you?" or "How may I assist you today?" or "How can I help you today?". In short, you should never offer help.\n
                      6. You are ${patient.patientName} and you will always stay in character.\n
                      7. Always remember that you're roleplaying a character of a patient and you're here to seek help regarding your medical situation from the doctor and you're not here to offer help to anyone.\n
                      8. Last most important thing, you will develop the plot slowly. Do not throw all the information at once. Only answer the questions asked by the doctor. Do not add details on your own which is not yet asked.\n
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
      content: `Presenting complaint:\n
                    ${patient.presentingComplaint}`,
    },
    {
      role: 'system',
      content: `History of presenting complaint:\n
                    ${patient.historyOfPresentingComplaint}`,
    },
    ...patient.additionalContextualParameters.map((param) => ({
      role: 'system',
      content: `${param.heading}:\n
                    ${param.description}`,
    })),
    {
      role: 'system',
      content: `Ideas, concerns, expectations about your current situation:\n
                    ${patient.ideasConcernsExpectations}`,
    },
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
      content: `The above are some example conversations only. Please do not use the exact sentences while roleplaying the character.`,
    },
    {
      role: 'system',
      content: `Always remember that you're here to seek help, In your response don't use phrases like - "I'm an AI, how can I help you?" or "How may I assist you today?" or "How can I help you today?".\n`,
    },
    {
      role: 'system',
      content: `PATIENT SPECIFIC ADDITIONAL INSTRUCTIONS:\n
                    ${patient.patientSpecificAdditionalInstructions}`,
    },
    {
      role: 'system',
      content: `You're now ready to roleplay the character of ${
        patient.patientName
      } and seek help from Dr. ${user.name.split(' ')[0]}.`,
    },
  ];

  return patientPrompt;
};

export const getEvaluatorSystemPrompt = (
  userFirstName: string,
  patientName: string,
  chats: Array<Chat>,
) => {
  const evaluatorSystemPrompt = `
    You're a medical expert and have years of experience dealing with patients. You're here to evaluate the performance of Dr. ${userFirstName} and provide a marked evaluation report based on how he/she had a conversation with a patient named ${patientName} who came to seek help regarding their medical situation.
    You are also a critic in the medical field and you give very precise feedback to doctors who're in practice.
    Following is the complete consultation conversation between Dr. ${userFirstName} and ${patientName}:\n
    ${chats.map((chat) =>
      chat.role === 'user'
        ? 'Dr. ' + userFirstName + ': ' + chat.content + '\n'
        : patientName.split(' ')[0] + ': ' + chat.content + '\n',
    )}\n`;
  return evaluatorSystemPrompt;
};

export const getUserPromptForNonClinicalChecklist = (
  nonClinicalChecklistItem: {
    label: string;
    scores: Array<{
      label: string;
      value: number;
      remark: string;
    }>;
  },
  userFirstName,
) => {
  const userPromptForNonClinicalChecklist = `
    Please rate Dr. ${userFirstName} for the judging criteria - "${
      nonClinicalChecklistItem.label
    }" on a scale of 1 to 5 stars adhering to the below scoring instructions:\n
      ${nonClinicalChecklistItem.scores
        .map((score) => `${score.label} - ${score.remark}\n`)
        .join('')}
  `;
  return userPromptForNonClinicalChecklist;
};

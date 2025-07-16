"use client"

import { useState, useCallback } from "react"
import { sendWhatsAppMessage, whatsappTemplates, scheduleReminders, formatPhoneNumber } from "@/lib/whatsapp"

export function useWhatsApp() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sendConfirmation = useCallback(
    async (appointmentData: {
      clientName: string
      clientPhone: string
      businessName: string
      service: string
      professional: string
      date: string
      time: string
      totalTime: number
      price: number
      appointmentDateTime: Date
    }) => {
      setIsLoading(true)
      setError(null)

      try {
        const message = whatsappTemplates.confirmation(appointmentData)
        const success = await sendWhatsAppMessage({
          to: formatPhoneNumber(appointmentData.clientPhone),
          message,
          type: "confirmation",
        })

        if (success) {
          // Schedule automatic reminders
          scheduleReminders(appointmentData)
          return true
        } else {
          throw new Error("Failed to send confirmation message")
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error")
        return false
      } finally {
        setIsLoading(false)
      }
    },
    [],
  )

  const sendReactivation = useCallback(
    async (clientData: {
      clientName: string
      clientPhone: string
      businessName: string
      preferredService: string
      customLink: string
    }) => {
      setIsLoading(true)
      setError(null)

      try {
        const message = whatsappTemplates.reactivation(clientData)
        const success = await sendWhatsAppMessage({
          to: formatPhoneNumber(clientData.clientPhone),
          message,
          type: "reactivation",
        })

        if (!success) {
          throw new Error("Failed to send reactivation message")
        }

        return true
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error")
        return false
      } finally {
        setIsLoading(false)
      }
    },
    [],
  )

  const sendCustomMessage = useCallback(async (phone: string, message: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const success = await sendWhatsAppMessage({
        to: formatPhoneNumber(phone),
        message,
        type: "custom",
      })

      if (!success) {
        throw new Error("Failed to send custom message")
      }

      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
      return false
    } finally {
      setIsLoading(false)
    }
  }, [])

  const sendBulkReactivation = useCallback(
    async (
      clients: Array<{
        clientName: string
        clientPhone: string
        preferredService: string
      }>,
      businessData: {
        businessName: string
        customLink: string
      },
    ) => {
      setIsLoading(true)
      setError(null)

      try {
        const results = await Promise.allSettled(
          clients.map((client) =>
            sendWhatsAppMessage({
              to: formatPhoneNumber(client.clientPhone),
              message: whatsappTemplates.reactivation({
                clientName: client.clientName,
                businessName: businessData.businessName,
                preferredService: client.preferredService,
                customLink: businessData.customLink,
              }),
              type: "reactivation",
            }),
          ),
        )

        const successful = results.filter((result) => result.status === "fulfilled" && result.value).length
        const failed = results.length - successful

        return { successful, failed, total: results.length }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error")
        return { successful: 0, failed: clients.length, total: clients.length }
      } finally {
        setIsLoading(false)
      }
    },
    [],
  )

  return {
    sendConfirmation,
    sendReactivation,
    sendCustomMessage,
    sendBulkReactivation,
    isLoading,
    error,
    clearError: () => setError(null),
  }
}

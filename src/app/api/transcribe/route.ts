import { NextRequest, NextResponse } from "next/server";
import { checkNoteLimit, incrementNoteCount, FREE_LIMITS } from "@/lib/tiers";

export const runtime = "nodejs";
const MAX_BODY_SIZE = 50 * 1024 * 1024; // 50MB

export async function POST(request: NextRequest) {
  try {
    const deepgramApiKey = process.env.DEEPGRAM_API_KEY;

    if (!deepgramApiKey) {
      return NextResponse.json(
        { error: "未配置 DEEPGRAM_API_KEY 环境变量" },
        { status: 500 }
      );
    }

    // Check note limit
    const limitCheck = await checkNoteLimit();

    if (!limitCheck.allowed) {
      return NextResponse.json(
        {
          error: "已达到免费版笔记上限（3条）。",
          limitReached: true,
          tier: limitCheck.tier,
          upgradeUrl: "/pricing",
        },
        { status: 403 }
      );
    }

    // Read the raw audio blob
    const audioBuffer = await request.arrayBuffer();

    if (!audioBuffer || audioBuffer.byteLength === 0) {
      return NextResponse.json(
        { error: "未接收到音频数据" },
        { status: 400 }
      );
    }

    const contentType = request.headers.get("content-type") || "audio/webm";

    // Send to Deepgram
    const deepgramResponse = await fetch(
      "https://api.deepgram.com/v1/listen?detect_language=true&punctuate=true&smart_format=true&utterances=true",
      {
        method: "POST",
        headers: {
          Authorization: `Token ${deepgramApiKey}`,
          "Content-Type": contentType,
        },
        body: audioBuffer,
      }
    );

    if (!deepgramResponse.ok) {
      const errorText = await deepgramResponse.text();
      console.error("Deepgram API error:", deepgramResponse.status, errorText);
      return NextResponse.json(
        {
          error: `语音转写失败: Deepgram返回状态码 ${deepgramResponse.status}`,
          detail: errorText,
        },
        { status: 502 }
      );
    }

    const deepgramResult = await deepgramResponse.json();

    console.log("Deepgram raw result:", JSON.stringify(deepgramResult).slice(0, 500));

    const fullTranscript =
      deepgramResult?.results?.channels?.[0]?.alternatives?.[0]?.transcript || "";

    if (!fullTranscript.trim()) {
      return NextResponse.json(
        {
          error: "未能识别出语音内容，请确认录音清晰度",
          detail: JSON.stringify(deepgramResult).slice(0, 300),
        },
        { status: 422 }
      );
    }

    const totalDuration = deepgramResult?.metadata?.duration || 0;
    let transcript = fullTranscript;
    let isTruncated = false;
    let lockedText = "";

    // Free tier: only first 3 minutes are transcribed
    if (limitCheck.tier === "free" && totalDuration > FREE_LIMITS.MAX_DURATION_SECONDS) {
      // Use utterances to find text within first 180 seconds
      const utterances = deepgramResult?.results?.utterances || [];
      const withinLimit = utterances
        .filter((u: { start: number }) => u.start < FREE_LIMITS.MAX_DURATION_SECONDS)
        .map((u: { transcript: string }) => u.transcript)
        .join(" ");

      const beyondLimit = utterances
        .filter((u: { start: number }) => u.start >= FREE_LIMITS.MAX_DURATION_SECONDS)
        .map((u: { transcript: string }) => u.transcript)
        .join(" ");

      if (withinLimit) {
        transcript = withinLimit;
      } else {
        // Fallback: estimate first half
        transcript = fullTranscript.slice(0, Math.floor(fullTranscript.length / 2));
      }

      isTruncated = true;
      lockedText = beyondLimit || fullTranscript.slice(transcript.length);
    }

    // Increment note count
    await incrementNoteCount();

    return NextResponse.json({
      success: true,
      transcript,
      isTruncated,
      lockedDuration: isTruncated
        ? Math.max(0, totalDuration - FREE_LIMITS.MAX_DURATION_SECONDS)
        : 0,
      totalDuration,
      tier: limitCheck.tier,
      notesRemaining: Math.max(0, limitCheck.remaining - 1),
      metadata: {
        duration: totalDuration,
        channels: deepgramResult?.metadata?.channels || 1,
      },
    });
  } catch (error) {
    console.error("转写接口异常:", error);
    return NextResponse.json(
      {
        error:
          "服务器内部错误: " +
          (error instanceof Error ? error.message : "未知错误"),
      },
      { status: 500 }
    );
  }
}
